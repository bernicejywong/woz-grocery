"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const router = useRouter();
  const params = useSearchParams();
  const next = useMemo(() => params.get("next") || "/", [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
    };

    setBusy(false);

    if (!res.ok || !data.ok) {
      setError(data.error || "Could not log in.");
      return;
    }

    router.replace(next);
  }

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={onSubmit}>
        <div className={styles.titleRow}>
          <div className={styles.lock}>🔒</div>
          <div className={styles.title}>Login</div>
        </div>

        <label className={styles.label}>Enter password</label>

        <div className={styles.inputRow}>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          <button className={styles.button} type="submit" disabled={busy}>
            {busy ? "…" : "→"}
          </button>
        </div>

        {error && <div className={styles.error}>{error}</div>}
      </form>
    </div>
  );
}
