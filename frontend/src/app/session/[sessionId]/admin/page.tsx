"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./wizard.module.css";
import { getSocket } from "@/lib/socket";
import type { LogRow, SessionState, TranscriptMessage } from "@/lib/types";

const TONES = ["Engaging", "Encouraging", "Supportive", "Utilitarian"] as const;

export default function WizardPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;

  const [state, setState] = useState<SessionState | null>(null);
  const [tone, setTone] = useState<(typeof TONES)[number]>("Supportive");
  const [draft, setDraft] = useState("");
  const [connected, setConnected] = useState(false);

  type AttachedImage = { dataUrl: string; name: string };
   
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

        function handleAttachClick() {
          fileInputRef.current?.click();
        }
 
        function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
          const file = e.target.files?.[0];
          if (!file) return;
          if (!file.type.startsWith("image/")) return;
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            setAttachedImage({ dataUrl, name: file.name }); // <-- THIS is the key line
          };

          reader.readAsDataURL(file);
          // allow selecting the same file again later
          e.target.value = "";
        }

  const socket = useMemo(() => getSocket(), []);
  const transcriptRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onConnect() {
      setConnected(true);
      socket.emit("join", { sessionId, role: "wizard" });
    }
    function onDisconnect() {
      setConnected(false);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    socket.on("state", (s: SessionState) => {
      setState(s);
    });

    socket.on("message", (m: TranscriptMessage) => {
      setState((prev) => {
        const p = prev ?? {
          sessionId,
          transcript: [],
          log: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        return { ...p, transcript: [...p.transcript, m], updatedAt: Date.now() };
      });
    });

    socket.on("log_update", (log: LogRow[]) => {
      setState((prev) => (prev ? { ...prev, log } : prev));
    });

    socket.on("state_patch", (patch: Partial<SessionState>) => {
      setState((prev) => (prev ? { ...prev, ...patch } : prev));
    });

    if (socket.connected) {
      setConnected(true);
      socket.emit("join", { sessionId, role: "wizard" });
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("state");
      socket.off("message");
      socket.off("log_update");
      socket.off("state_patch");
    };
  }, [socket, sessionId]);

    useEffect(() => {
      const el = transcriptRef.current;
      if (!el) return;
      // Scroll only the transcript container, not the whole page
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }, [state?.transcript?.length]);

  async function logout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function send() {
    const trimmed = draft.trim();
    const hasImage = !!attachedImage?.dataUrl;

    // allow sending either text OR image
    if (!trimmed && !hasImage) return;

    socket.emit("send_message", {
      sessionId,
      role: "wizard",
      message: trimmed,
      tone,
      imageDataUrl: attachedImage?.dataUrl,
      imageName: attachedImage?.name
    });

    setDraft("");
    setAttachedImage(null);
  }

  async function exportCsv() {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    const url = `${base}/session/${sessionId}/export.csv`;
    window.location.href = url;
  }

  async function reset() {
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    await fetch(`${base}/session/${sessionId}/reset`, { method: "POST", credentials: "include" }).catch(() => {});
    socket.emit("reset_session", { sessionId });
  }


  function updateLogRow(logId: string, patch: Partial<Pick<LogRow, "notes">>) {
    socket.emit("update_log_row", { sessionId, logId, ...patch });
    setState((prev) => {
      if (!prev) return prev;
      const nextLog = prev.log.map((r) => (r.id === logId ? { ...r, ...patch } : r));
      return { ...prev, log: nextLog };
    });
  }

  const transcript = state?.transcript ?? [];
  const log = state?.log ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerTitle}>Dashboard</div>
        </div>

        <div className={styles.headerRight}>
          <button className={styles.btnBlack} onClick={exportCsv}>
            Export CSV
          </button>
          <button className={styles.btnRed} onClick={reset}>
            Reset session
          </button>
          <span className={styles.logout} onClick={logout} role="button" tabIndex={0}>
            Log out
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.twoCol}>
          <section className={styles.panel}>
            <div className={styles.panelTitle}>Conversation</div>

            <div className={styles.transcript} ref={transcriptRef}>
              {transcript.length === 0 ? (
                <div className={styles.empty}>No messages yet</div>
              ) : (
                transcript.map((m) => (
                  <div key=
                    {m.id} className={`${styles.msg} ${m.role === "participant" ? styles.msgUser : ""}`}>
                    <div>{m.message ? <div className={styles.msgText}>{m.message}</div> : null} 
                    {m.imageDataUrl ? (
                    <div className={styles.msgAttachment}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                          src={m.imageDataUrl}
                          alt={m.imageName || "Sent image"}
                          className={styles.msgImage}
                        />
                    </div>

                    ) : null}
                    </div>
                    <div className={styles.msgMeta}>
                      {m.role === "participant" ? "User" : "Wizard"}
                      {m.role === "wizard" && m.tone ? ` • ${m.tone}` : ""}
                    </div>
                  </div>
                ))
              )}
            </div>

            {!connected && <div className={styles.smallMuted}>Reconnecting…</div>}
          </section>

          <section className={styles.panel}>
            <div className={styles.panelTitle}>Wizard response</div>

            <div className={styles.fieldLabel}>Tone</div>
            <select className={styles.select} value={tone} onChange={(e) => setTone(e.target.value as any)}>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <textarea
              className={styles.textarea}
              placeholder="Type response here"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />

            {attachedImage?.dataUrl && (
            <div className={styles.attachmentPreview}>
            <div className={styles.previewThumbWrap}>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
            <img

                    src={attachedImage.dataUrl}

                    alt={attachedImage.name || "Selected attachment"}

                    className={styles.previewThumb}

                  />
            </div>
             
                <div className={styles.previewMeta}>
            <div className={styles.previewName}>

                    {attachedImage.name || "Image attachment"}
            </div>
             
                  <button

                    type="button"

                    className={styles.removeAttachment}

                    onClick={() => setAttachedImage(null)}
            >

                    Remove
            </button>
            </div>
            </div>

            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = () => {
                  const dataUrl = String(reader.result || "");
                  setAttachedImage({ dataUrl, name: file.name });
                };
                reader.readAsDataURL(file);

                // allow selecting the same file again later
                e.currentTarget.value = "";
              }}
            />

            <div className={styles.actions}>
              <button
                className={styles.btnOutline}
                type="button"
                onClick={() => fileInputRef.current?.click()}
              >
                Attach image
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                style={{ display: "none" }}
              />

              <button className={styles.btnSend} onClick={send}>
                Send
              </button>
            </div>

            <div className={styles.guidelines}>
              <div className={styles.guidelinesTitle}>Guidelines</div>
              <ul>
                <li>No emojis, no humor, no corporate tone</li>
                <li>Ask permission before cart/list changes</li>
                <li>Never imply checkout/payment</li>
                <li>No medical advice</li>
                <li>Be clear, practical, inclusive</li>
              </ul>
            </div>
          </section>
        </div>

        <section className={styles.tableWrap}>
          <div className={styles.tableHeader}>Message log</div>

          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>User message</th>
                <th className={styles.th}>Response</th>
                <th className={styles.th}>Notes</th>
              </tr>
            </thead>
            <tbody>
              {log.length === 0 ? (
                <tr>
                  <td className={styles.td} colSpan={3} style={{ color: "var(--muted)" }}>
                    No log entries yet
                  </td>
                </tr>
              ) : (
                log.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.td}>{row.userMessage}</td>
                    <td className={styles.td}>
                      {row.response}
                      {row.imageName ? (
                    <div className={styles.smallMuted}>Attachment: {row.imageName}</div>
                      ) : null}
                    <div className={styles.smallMuted}>{row.tone}</div>
                    </td>
                    <td className={styles.td}>
                      <input
                        className={styles.notesInput}
                        placeholder="Add a note…"
                        value={row.notes}
                        onChange={(e) => updateLogRow(row.id, { notes: e.target.value })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}
