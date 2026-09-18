"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { colorForIndex } from "@/lib/palette";

interface PublicQuestion {
  kind: "text" | "flag" | "emoji" | "letter-hive" | "choices";
  display: string;
  meta?: { choices?: string[]; center?: string; outerLetters?: string[]; category?: string };
}

interface RoomState {
  code: string;
  gameSlug: string;
  title: string;
  instructions: string;
  status: "LOBBY" | "ACTIVE" | "FINISHED";
  roundNum: number;
  roundLimit: number;
  timerSeconds: number;
  roundStartAt: string | null;
  answered: boolean;
  question: PublicQuestion | null;
  scores: { login: string; name: string; color: string; score: number }[];
}

function getOrCreateLogin(): string {
  const KEY = "dawwar_login";
  let v = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (!v) {
    v = `guest_${Math.random().toString(36).slice(2, 10)}`;
    if (typeof window !== "undefined") localStorage.setItem(KEY, v);
  }
  return v;
}

export default function TriviaBoard({ gameSlug, emoji, title }: { gameSlug: string; emoji: string; title: string }) {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [guess, setGuess] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const lastQuestionKey = useRef<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/trivia/rooms/${code}`)
        .then((r) => r.json())
        .then((data: RoomState) => setRoom(data))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 1200);
    return () => clearInterval(id);
  }, [code]);

  useEffect(() => {
    if (!room?.question) return;
    const key = `${room.roundNum}-${room.question.display}`;
    if (key === lastQuestionKey.current) return;
    lastQuestionKey.current = key;
    setFlash(null);
    if (promptRef.current) {
      gsap.fromTo(
        promptRef.current,
        { opacity: 0, scale: 0.7, rotate: -6 },
        { opacity: 1, scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.8)" }
      );
    }
  }, [room?.roundNum, room?.question]);

  async function createRoom() {
    setBusy(true);
    try {
      const res = await fetch("/api/trivia/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gameSlug })
      });
      const data = await res.json();
      setCode(data.code);
      setRoom(data);
    } finally {
      setBusy(false);
    }
  }

  async function startGame() {
    if (!code) return;
    await fetch(`/api/trivia/rooms/${code}/start`, { method: "POST" });
  }

  async function submitGuess() {
    if (!code || !guess.trim() || !name.trim()) return;
    const res = await fetch(`/api/trivia/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, name: name.trim(), color: colorForIndex(0), message: guess.trim() })
    });
    const data = await res.json();
    setGuess("");
    if (data.correct) {
      setFlash(`✅ ${data.winnerName} جاوب صح!`);
      setRoom(data);
      setTimeout(() => fetch(`/api/trivia/rooms/${code}/next`, { method: "POST" }), 1800);
    }
  }

  async function skipRound() {
    if (!code) return;
    await fetch(`/api/trivia/rooms/${code}/next`, { method: "POST" });
  }

  const promptNode = useMemo(() => renderPrompt(room?.question ?? null), [room?.question]);

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>
          {emoji} {title}
        </h1>
        <button onClick={createRoom} disabled={busy} style={primaryBtn}>
          ➕ إنشاء غرفة
        </button>
      </div>
    );
  }

  if (!room) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>
          {emoji} {title} — غرفة {room.code}
        </h2>
        <span style={{ color: "var(--text-dim)", fontSize: 14 }}>
          جولة {room.roundNum}/{room.roundLimit}
        </span>
      </header>

      {room.status === "LOBBY" && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ color: "var(--text-dim)" }}>{room.instructions}</p>
          <button onClick={startGame} style={primaryBtn}>
            ▶ ابدأ اللعبة
          </button>
        </div>
      )}

      {room.status === "ACTIVE" && (
        <>
          <div ref={promptRef} style={promptBoxStyle}>
            {promptNode}
          </div>

          <div style={{ display: "flex", gap: 10, maxWidth: 480, margin: "24px auto 0" }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسمك"
              style={{ ...inputStyle, maxWidth: 130 }}
            />
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitGuess()}
              placeholder="اكتب إجابتك..."
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={submitGuess} style={primaryBtn}>
              ✅
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 14 }}>
            <button onClick={skipRound} style={ghostBtn}>
              تخطي ⏭
            </button>
          </div>

          {flash && <p style={{ textAlign: "center", fontWeight: 800, color: "var(--accent-2)", marginTop: 16 }}>{flash}</p>}
        </>
      )}

      {room.status === "FINISHED" && (
        <div style={{ textAlign: "center", padding: 40 }}>
          <h3 style={{ fontSize: 26 }}>🏁 خلصت الجولات!</h3>
        </div>
      )}

      <ScoreBoard scores={room.scores} />
    </div>
  );
}

function renderPrompt(q: PublicQuestion | null): React.ReactNode {
  if (!q) return null;
  if (q.kind === "flag") return <span style={{ fontSize: 100 }}>{q.display}</span>;
  if (q.kind === "emoji")
    return (
      <div>
        {q.meta?.category && <p style={{ color: "var(--text-dim)", marginBottom: 10 }}>الفئة: {q.meta.category}</p>}
        <span style={{ fontSize: 64, letterSpacing: 12 }}>{q.display}</span>
      </div>
    );
  if (q.kind === "letter-hive")
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <p style={{ margin: 0, color: "var(--text-dim)" }}>{q.display}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap", maxWidth: 260 }}>
          <span style={hiveCenterStyle}>{q.meta?.center}</span>
          {q.meta?.outerLetters?.map((l, i) => (
            <span key={i} style={hiveLetterStyle}>
              {l}
            </span>
          ))}
        </div>
      </div>
    );
  return <p style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>{q.display}</p>;
}

function ScoreBoard({ scores }: { scores: RoomState["scores"] }) {
  if (!scores.length) return null;
  return (
    <div style={{ marginTop: 40 }}>
      <h4 style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 12 }}>النقاط</h4>
      {scores.map((s, i) => (
        <div key={s.login} style={scoreRowStyle}>
          <span style={{ width: 26, fontWeight: 800, color: "var(--text-dim)" }}>#{i + 1}</span>
          <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.color }} />
          <span style={{ flex: 1, fontWeight: 700 }}>{s.name}</span>
          <span style={{ fontWeight: 800, color: "var(--accent-2)" }}>{s.score}</span>
        </div>
      ))}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "12px 22px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent)",
  color: "#1a1a1a",
  fontWeight: 800
};

const ghostBtn: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text-dim)",
  fontSize: 13
};

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)"
};

const promptBoxStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 22,
  padding: "50px 30px",
  textAlign: "center",
  maxWidth: 560,
  margin: "0 auto"
};

const hiveCenterStyle: React.CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 10,
  background: "var(--accent)",
  color: "#1a1a1a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 20
};

const hiveLetterStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 10,
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: 17
};

const scoreRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "9px 14px",
  borderRadius: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  marginBottom: 6,
  maxWidth: 420
};
