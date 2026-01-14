"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const SCENARIOS = [
  "Help me plan dinners for my household with one vegetarian night, low sodium options, and using items I already have.",
  "I want to stock up for the week. Start with what I bought last trip but help me find the best value using any weekly deals or substitutions.",
  "I’m gluten/nut free. Help me shop with healthier swaps without spending a lot more.",
  "I see Tropicana orange juice advertised at 2 for $9, but the store-brand orange juice looks cheaper. There’s also a mix-and-match Buy 4, Save $2 deal on Tropicana drinks. What should I buy to get the best deal?"
];

const SCENARIO_SLUGS = ["dinners", "stock-up", "gluten-free", "best-deals"] as const;

const PARTICIPANT_ID_KEY = "woz_participant_id";
const SCENARIO_MAP_KEY_PREFIX = "woz_scenario_map:"; // + participantId

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

type ScenarioMap = Record<string, string>; // scenarioKey -> sessionId

export default function Home() {
  const router = useRouter();

  const [participantId, setParticipantId] = useState<string | null>(null);
  const [scenarioMap, setScenarioMap] = useState<ScenarioMap>({});

  const mapStorageKey = useMemo(() => {
    if (!participantId) return "";
    return `${SCENARIO_MAP_KEY_PREFIX}${participantId}`;
  }, [participantId]);

  // Initialize participant id + load their scenario map (client-only)
  useEffect(() => {
    let pid = localStorage.getItem(PARTICIPANT_ID_KEY);
    if (!pid) {
      pid = randomId("p");
      localStorage.setItem(PARTICIPANT_ID_KEY, pid);
    }
    setParticipantId(pid);

    const key = `${SCENARIO_MAP_KEY_PREFIX}${pid}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        setScenarioMap(JSON.parse(raw));
      } catch {
        setScenarioMap({});
      }
    }
  }, []);

  function persistMap(pid: string, next: ScenarioMap) {
    localStorage.setItem(`${SCENARIO_MAP_KEY_PREFIX}${pid}`, JSON.stringify(next));
    setScenarioMap(next);
  }

  async function startScenario(scenarioIndex: number) {
    if (!participantId) return;

    const scenarioText = SCENARIOS[scenarioIndex];
    const scenarioKey = `scenario_${scenarioIndex}`;

    // If we already have a session for this scenario, reuse it
    const existing = scenarioMap[scenarioKey];
    if (existing) {
      router.push(`/session/${existing}`);
      return;
    }

    // Otherwise create a new sessionId for this scenario
const scenarioSlug = SCENARIO_SLUGS[scenarioIndex];
 
    const res = await fetch("/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        participantId,
        scenarioSlug
      })
    });
    if (!res.ok) {
      alert("Could not start a new session. Please try again.");
      return;
    }

    const data = (await res.json()) as { sessionId: string };
    const sessionId = data.sessionId;

    const nextMap = { ...scenarioMap, [scenarioKey]: sessionId };
    persistMap(participantId, nextMap);

    // Send user into the chat with prefilled draft (chat page decides when to apply)
    router.push(`/session/${sessionId}?prefill=${encodeURIComponent(scenarioText)}`);
  }

  function startAsNewParticipant() {
    // New participant = new id + fresh scenario map
    const pid = randomId("p");
    localStorage.setItem(PARTICIPANT_ID_KEY, pid);
    setParticipantId(pid);
    setScenarioMap({});
    localStorage.removeItem(`${SCENARIO_MAP_KEY_PREFIX}${participantId ?? ""}`);
  }

  async function logout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "white" }}>
      <header
        style={{
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 22px",
          borderBottom: "1px solid #e5e7eb"
        }}
      >
        <div style={{ fontWeight: 600 }}>Grocery Assistant</div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 13, color: "#6b7280" }}>
          <button
            onClick={startAsNewParticipant}
            style={{
              border: "1px solid #e5e7eb",
              background: "white",
              borderRadius: 999,
              padding: "8px 12px",
              cursor: "pointer"
            }}
          >
            Start as new participant
          </button>

          <span
            onClick={logout}
            style={{ textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}
          >
            Log out
          </span>
        </div>
      </header>

      <main style={{ padding: "28px 18px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontSize: 28, fontWeight: 600, margin: "18px 0 24px" }}>
            Choose a scenario to get started
          </div>

          <div className="scenarioGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {SCENARIOS.map((text, idx) => (
              <div
                key={idx}
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 16,
                  padding: 18,
                  background: "white",
                  minHeight: 155,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between"
                }}
              >
                <div style={{ fontSize: 14, lineHeight: 1.35, color: "#1f2937" }}>{text}</div>

                <button
                  onClick={() => startScenario(idx)}
                  style={{
                    alignSelf: "center",
                    marginTop: 12,
                    border: "1px solid #e5e7eb",
                    background: "#111",
                    color: "white",
                    borderRadius: 999,
                    padding: "10px 18px",
                    cursor: "pointer",
                    minWidth: 120
                  }}
                >
                  Start
                </button>
              </div>
            ))}
          </div>

          <div style={{ height: 40 }} />
        </div>
      </main>

    </div>
  );
}
