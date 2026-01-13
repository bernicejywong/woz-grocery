export type Role = "participant" | "wizard";

export type TranscriptMessage = {
  id: string;
  timestamp: number;
  role: Role;
  message: string;
  tone?: string;
  notes?: string;
  imageDataUrl?: string;
  imageName?: string;
};

export type LogRow = {
  id: string;
  timestamp: number;
  userMessage: string;
  response: string;
  imageName?: string;
  tone: string;
  notes: string;
  wizardMessageId: string;
};

export type SessionState = {
  sessionId: string;
  transcript: TranscriptMessage[];
  log: LogRow[];
  createdAt: number;
  updatedAt: number;
};
