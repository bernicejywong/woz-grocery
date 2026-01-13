export function makeSessionId(): string {
  // lightweight, URL-safe
  const rand = Math.random().toString(16).slice(2);
  return `s_${Date.now().toString(16)}_${rand}`;
}
