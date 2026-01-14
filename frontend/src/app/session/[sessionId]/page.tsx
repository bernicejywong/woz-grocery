"use client";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter, useSearchParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import styles from "./participant.module.css";

type Role = "participant" | "wizard";

type TranscriptMessage = {
  id: string;
  timestamp: number;
  role: Role;
  message: string;
  tone?: string;
  notes?: string;
  imageDataUrl?: string;
  imageName?: string;
};

type SessionState = {
  sessionId: string;
  transcript: TranscriptMessage[];
};

export default function ParticipantSessionPage({ params }: { params: { sessionId: string } }) {
  const sessionId = params.sessionId;

  const router = useRouter();
  const searchParams = useSearchParams();

  const [draft, setDraft] = useState("");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const didApplyPrefillRef = useRef(false);
  const messagesRef = useRef<HTMLDivElement | null>(null);

  // Prefill only if session is empty (so reopening the same scenario doesn't overwrite draft)
  useEffect(() => {
    if (didApplyPrefillRef.current) return;
    const prefill = searchParams.get("prefill");
    if (prefill && draft.trim().length === 0 && transcript.length === 0) {
      setDraft(prefill);
    }
    didApplyPrefillRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, transcript.length]);

  // Socket connection
  useEffect(() => {
   const s = io({
    transports: ["websocket", "polling"],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 500
  });

    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      s.emit("join", { sessionId, role: "participant" });
    });

    s.on("disconnect", () => setConnected(false));

    s.on("state", (state: SessionState) => {
      if (!state || state.sessionId !== sessionId) return;
      setTranscript(state.transcript || []);
    });

    // IMPORTANT: backend messages DO NOT include sessionId, so do not filter on it.
    s.on("message", (msg: TranscriptMessage) => {
      if (!msg || !msg.id) return;
      setTranscript((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].sort((a, b) => a.timestamp - b.timestamp);
      });
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      socketRef.current = null;
    };
  }, [sessionId]);

  // Auto-scroll
  useLayoutEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
   
    // wait a paint so scrollHeight reflects the newly rendered message
    requestAnimationFrame(() => {
      el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
    });
  }, [transcript.length]);

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  function send() {
    const text = draft.trim();
    if (!text) return;

    socketRef.current?.emit("send_message", {
      sessionId,
      role: "participant",
      message: text
    });

    setDraft("");

    requestAnimationFrame(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/")}
            aria-label="Back to scenarios"
            type="button"
          >
            ←
          </button>
          <span>Grocery Assistant</span>
        </div>

        <div className={styles.headerRight}>
          <span
            className={styles.logout}
            role="button"
            tabIndex={0}
            onClick={logout}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") logout();
            }}
          >
            Log out
          </span>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.chatArea}>
          <div className={styles.messages} ref={messagesRef}>
            {transcript.map((m) => {
              const isUser = m.role === "participant";
              return (
                <div key={m.id} className={isUser ? styles.rowRight : styles.rowLeft}>
                    <div className={isUser ? styles.bubbleRight : styles.bubbleLeft}>
                      {m.imageDataUrl && (
                        <img
                          src={m.imageDataUrl}
                          alt={m.imageName || "attached image"}
                          onLoad={() => {
                            const el = messagesRef.current;
                            if (!el) return;
                            el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
                          }}
                          style={{
                            maxWidth: "100%",
                            width: "100%",
                            height: "auto",
                            borderRadius: 12,
                            display: "block",
                            marginBottom: m.message ? 8 : 0
                          }}
                        />
                      )}
                      <div className={styles.bubbleText}>
                        <ReactMarkdown
                          components={{
                            p: ({ children }) => <p style={{ margin: "0 0 10px 0" }}>{children}</p>,
                            strong: ({ children }) => <strong>{children}</strong>,
                          }}
                        >
                          {m.message}
                        </ReactMarkdown>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          <div className={styles.composerWrap}>
            <div className={styles.composer}>
              <textarea
                className={styles.input}
                placeholder="Write a message"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
              />
              <button
                className={styles.sendBtn}
                onClick={send}
                type="button"
                aria-label="Send"
                disabled={!connected || draft.trim().length === 0}
              >
                ↑
              </button>
            </div>

            <div className={styles.disclaimer}>Please don’t share personal or sensitive information.</div>
          </div>
        </div>
      </main>
    </div>
  );
}
