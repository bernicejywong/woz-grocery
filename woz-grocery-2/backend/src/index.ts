import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import http from "http";
import { getOrCreateSession, resetSession, touch, type TranscriptMessage, type LogRow } from "./store.js";
import { sessionToCsv } from "./csv.js";
import next from "next";
import path from "path";

const PORT = Number(process.env.PORT || 4000);
 
// In a single-service deploy, frontend and backend are same-origin.

// Keep env for local dev if you want, but allow same-origin on Render.

const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
 
async function main() {

  const dev = process.env.NODE_ENV !== "production";
 
  // Point Next at your /frontend folder

  const nextApp = next({

    dev,

    dir: path.join(process.cwd(), "frontend")

  });

  const handle = nextApp.getRequestHandler();
 
  await nextApp.prepare();
 
  const app = express();

  app.use(express.json());
 
  // CORS is only needed if your frontend is on a different origin.

  // In the single-service setup it’s same-origin, but leaving this is fine for local.

  app.use(

    cors({

      origin: FRONTEND_ORIGIN,

      credentials: true

    })

  );
 
  app.get("/health", (_req, res) => {

    res.json({ ok: true });

  });
 
  // --- your existing REST routes (keep as-is) ---

  app.post("/session/create", (req, res) => {

    // keep your current handler OR your new sessionId logic here

    const sessionId = `s_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`;

    const s = getOrCreateSession(sessionId);

    res.json({ sessionId: s.sessionId });

  });
 
  app.get("/session/:sessionId/state", (req, res) => {

    const sessionId = req.params.sessionId;

    const s = getOrCreateSession(sessionId);

    res.json(s);

  });
 
  app.post("/session/:sessionId/reset", (req, res) => {

    const sessionId = req.params.sessionId;

    const s = resetSession(sessionId);

    res.json(s);

  });
 
  app.get("/session/:sessionId/export.csv", (req, res) => {

    const sessionId = req.params.sessionId;

    const s = getOrCreateSession(sessionId);

    const csv = sessionToCsv(s);
 
    res.setHeader("Content-Type", "text/csv; charset=utf-8");

    res.setHeader("Content-Disposition", `attachment; filename="session-${sessionId}.csv"`);

    res.send(csv);

  });
 
  // Let Next handle all other routes (/, /session/..., /api/login, etc.)

  app.all("*", (req, res) => handle(req, res));
 
  const server = http.createServer(app);
 
  const io = new Server(server, {

    cors: {

      origin: FRONTEND_ORIGIN,

      credentials: true

    }

  });
 
  function uid(prefix: string) {

    return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;

  }
 
io.on("connection", (socket) => {
  socket.on("join", ({ sessionId, role }: { sessionId: string; role: "participant" | "wizard" }) => {
    if (!sessionId) return;
    socket.join(sessionId);

    const s = getOrCreateSession(sessionId);
    socket.emit("state", s);

    // Optional: announce connection
    touch(sessionId);
  });

  socket.on(
  "send_message",
  (payload: {
    sessionId: string;
    role: "participant" | "wizard";
    message?: string;
    tone?: string;
    imageDataUrl?: string;
    imageName?: string;
  }) => {
    const { sessionId, role, message, tone, imageDataUrl, imageName } = payload;
    if (!sessionId || !role) return;

    const trimmed = (message || "").trim();
    const hasImage = typeof imageDataUrl === "string" && imageDataUrl.startsWith("data:image/");

    // IMPORTANT: allow sending either text OR image
    if (!trimmed && !hasImage) return;

    const s = getOrCreateSession(sessionId);

    const msg: TranscriptMessage = {
      id: uid("m"),
      timestamp: Date.now(),
      role,
      message: trimmed,
      tone: role === "wizard" ? (tone || "Supportive") : undefined,
      imageDataUrl: hasImage ? imageDataUrl : undefined,
      imageName: hasImage ? imageName : undefined
    };

    // If wizard message, create/update log row tied to most recent participant message
    if (role === "wizard") {
      const lastUser = [...s.transcript].reverse().find((m) => m.role === "participant");
      const userMessage = lastUser?.message ?? "";

      const logRow: LogRow = {
        id: uid("l"),
        timestamp: msg.timestamp,
        userMessage,
        response: msg.message, // note: response log remains text-only
        imageName: msg.imageName,
        tone: msg.tone || "",
        notes: "",
        wizardMessageId: msg.id
      };

      s.log.push(logRow);
      msg.notes = logRow.notes;
    }

    s.transcript.push(msg);
    s.updatedAt = Date.now();

    io.to(sessionId).emit("message", msg);
    io.to(sessionId).emit("log_update", s.log);
  }
);

  socket.on(
    "update_log_row",
    (payload: { sessionId: string; logId: string; notes?: string }) => {
      const { sessionId, logId } = payload;
      if (!sessionId || !logId) return;
      const s = getOrCreateSession(sessionId);

      const row = s.log.find((r) => r.id === logId);
      if (!row) return;

      if (typeof payload.notes === "string") row.notes = payload.notes;

      // Mirror updates onto the linked wizard transcript message for CSV export
      const wizardMsg = s.transcript.find((m) => m.id === row.wizardMessageId);
      if (wizardMsg) {
        wizardMsg.notes = row.notes;
      }

      s.updatedAt = Date.now();
      io.to(sessionId).emit("log_update", s.log);
      io.to(sessionId).emit("state_patch", { transcript: s.transcript });
    }
  );

  socket.on("reset_session", ({ sessionId }: { sessionId: string }) => {
    if (!sessionId) return;
    const s = resetSession(sessionId);
    io.to(sessionId).emit("state", s);
  });
});
 
  server.listen(PORT, () => {

    console.log(`Listening on port ${PORT}`);

  });

}
 
main().catch((err) => {

  console.error(err);

  process.exit(1);

});


