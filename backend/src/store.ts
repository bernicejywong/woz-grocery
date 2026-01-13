export type Role = "participant" | "wizard";

export type TranscriptMessage = {
  id: string;
  timestamp: number; // ms epoch
  role: Role;
  message: string;
  tone?: string; // wizard only
  // For CSV export
  notes?: string;

  // NEW:
  imageDataUrl?: string; // e.g. "data:image/png;base64,...."
  imageName?: string;    // original filename
};

export type LogRow = {
  id: string;
  timestamp: number; // wizard send time
  userMessage: string;
  response: string;
  //If wizard attached an image, store the original filename for logging
  imageName?: string;
  tone: string;
  notes: string;
  wizardMessageId: string; // link to transcript message
};

export type SessionState = {
  sessionId: string;
  transcript: TranscriptMessage[];
  log: LogRow[];
  createdAt: number;
  updatedAt: number;
};

const sessions = new Map<string, SessionState>();

export function getOrCreateSession(sessionId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const now = Date.now();
  const s: SessionState = {
    sessionId,
    transcript: [],
    log: [],
    createdAt: now,
    updatedAt: now
  };
  sessions.set(sessionId, s);
  return s;
}

export function resetSession(sessionId: string): SessionState {
  const now = Date.now();
  const s: SessionState = {
    sessionId,
    transcript: [],
    log: [],
    createdAt: now,
    updatedAt: now
  };
  sessions.set(sessionId, s);
  return s;
}

export function touch(sessionId: string) {
  const s = getOrCreateSession(sessionId);
  s.updatedAt = Date.now();
}

export function listSessions(): SessionState[] {
  return Array.from(sessions.values());
}
