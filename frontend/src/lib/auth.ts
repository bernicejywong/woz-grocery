import crypto from "crypto";

const COOKIE_NAME = "woz_auth";

export function cookieName() {
  return COOKIE_NAME;
}

export function signAuthToken(payload: string, secret: string) {
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${sig}`;
}

export function verifyAuthToken(token: string, secret: string) {
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [payload, sig] = parts;
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
