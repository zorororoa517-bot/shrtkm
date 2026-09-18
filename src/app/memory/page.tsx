"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { colorForIndex } from "@/lib/palette";

interface Card {
  index: number;
  icon: string | null;
  matched: boolean;
}
interface GameState {
  code: string;
  level: number;
  pairCount: number;
  durationSecs: number;
  status: "LOBBY" | "ACTIVE" | "FINISHED";
  matches: number;
  flippedA: number | null;
  roundStartAt: string | null;
  cards: Card[];
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

export default function MemoryPage() {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [game, setGame] = useState<GameState | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [mismatch, setMismatch] = useState<number[]>([]);
  const [finishInfo, setFinishInfo] = useState<{ reward: { stars: number; jump: number }; newLevel: number } | null>(null);
  const cardRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/memory/games/${code}`)
        .then((r) => r.json())
        .then((data: GameState) => setGame(data))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [code]);

  useEffect(() => {
    if (!game?.status || game.status !== "ACTIVE" || !game.roundStartAt) return;
    const start = new Date(game.roundStartAt).getTime();
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const left = Math.max(0, Math.round(game.durationSecs - elapsed));
      setTimeLeft(left);
      if (left <= 0 && code) {
        fetch(`/api/memory/games/${code}/timeout`, { method: "POST" })
          .then((r) => r.json())
          .then((data) => {
            setGame(data);
            if (data.reward) setFinishInfo({ reward: data.reward, newLevel: data.newLevel });
          });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game?.status, game?.roundStartAt, game?.durationSecs, code]);

  async function createGame() {
    const savedLevel = Number(localStorage.getItem("dawwar_memory_level")) || 1;
    const res = await fetch("/api/memory/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: savedLevel })
    });
    const data = await res.json();
    setCode(data.code);
    setGame(data);
  }

  async function startGame() {
    if (!code) return;
    const res = await fetch(`/api/memory/games/${code}/start`, { method: "POST" });
    setGame(await res.json());
  }

  async function flip(index: number) {
    if (!code || !name.trim() || !game || game.status !== "ACTIVE") return;
    const el = cardRefs.current[index];
    if (el) gsap.to(el, { rotateY: 180, duration: 0.35, ease: "power2.inOut" });

    const res = await fetch(`/api/memory/games/${code}/flip`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, name: name.trim(), color: colorForIndex(0), index })
    });
    const data = await res.json();

    if (data.mismatchReveal) {
      setMismatch([data.mismatchReveal.a.index, data.mismatchReveal.b.index]);
      setGame({
        ...data,
        cards: data.cards.map((c: Card) =>
          c.index === data.mismatchReveal.a.index
            ? { ...c, icon: data.mismatchReveal.a.icon }
            : c.index === data.mismatchReveal.b.index
              ? { ...c, icon: data.mismatchReveal.b.icon }
              : c
        )
      });
      setTimeout(() => {
        setMismatch([]);
        setGame(data);
      }, 900);
      return;
    }

    setGame(data);
    if (data.finished) {
      localStorage.setItem("dawwar_memory_level", String(data.newLevel));
      setFinishInfo({ reward: data.reward, newLevel: data.newLevel });
    }
  }

  async function nextBoard() {
    if (!code) return;
    const level = finishInfo?.newLevel ?? game?.level ?? 1;
    const res = await fetch(`/api/memory/games/${code}/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level })
    });
    setGame(await res.json());
    setFinishInfo(null);
  }

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 30, fontWeight: 900 }}>🧠 لعبة الذاكرة</h1>
        <button onClick={createGame} style={primaryBtn}>
          ➕ إنشاء لوحة
        </button>
      </div>
    );
  }

  if (!game) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  const cols = Math.ceil(Math.sqrt(game.pairCount * 2));

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>🧠 لعبة الذاكرة — لفل {game.level}</h2>
        <span style={{ color: "var(--text-dim)" }}>
          {game.matches}/{game.pairCount} زوج · ⏱️ {timeLeft}ث
        </span>
      </header>

      {game.status === "LOBBY" && (
        <div style={{ textAlign: "center", padding: 30 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" style={inputStyle} />
          <div style={{ marginTop: 16 }}>
            <button onClick={startGame} disabled={!name.trim()} style={primaryBtn}>
              ▶ ابدأ
            </button>
          </div>
        </div>
      )}

      {game.status !== "LOBBY" && (
        <div style={{ ...gridStyle, gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {game.cards.map((c) => (
            <button
              key={c.index}
              ref={(el) => {
                cardRefs.current[c.index] = el;
              }}
              onClick={() => !c.matched && !c.icon && flip(c.index)}
              disabled={c.matched || game.status !== "ACTIVE"}
              style={{
                ...cardStyle,
                background: c.matched ? "rgba(62,207,110,.18)" : mismatch.includes(c.index) ? "rgba(242,73,91,.18)" : "var(--surface-2)",
                borderColor: c.matched ? "var(--accent-2)" : mismatch.includes(c.index) ? "var(--danger)" : "var(--border-strong)"
              }}
            >
              {c.icon ?? "❓"}
            </button>
          ))}
        </div>
      )}

      {game.scores.length > 0 && (
        <div style={{ marginTop: 30 }}>
          {game.scores.map((s) => (
            <div key={s.login} style={scoreRowStyle}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: s.color }} />
              <span style={{ flex: 1, fontWeight: 700 }}>{s.name}</span>
              <span style={{ fontWeight: 800, color: "var(--accent-2)" }}>{s.score}</span>
            </div>
          ))}
        </div>
      )}

      {game.status === "FINISHED" && finishInfo && (
        <div style={overlayStyle}>
          <div style={overlayCardStyle}>
            <h3 style={{ fontSize: 24, margin: "0 0 10px" }}>
              {finishInfo.reward.jump > 0 ? "🆙 ترقية!" : "⏰ خلص الوقت"}
            </h3>
            <div style={{ fontSize: 30, margin: "10px 0" }}>
              {[1, 2, 3].map((i) => (
                <span key={i} style={{ opacity: i <= finishInfo.reward.stars ? 1 : 0.25 }}>
                  ⭐
                </span>
              ))}
            </div>
            <p style={{ color: "var(--text-dim)" }}>
              {finishInfo.reward.jump > 0
                ? `جبتوا ${game.matches} زوج — لفل ${finishInfo.newLevel} الجاي`
                : `جبتوا ${game.matches} زوج بس — لازم 5 على الأقل، نفس اللفل`}
            </p>
            <button onClick={nextBoard} style={primaryBtn}>
              🔁 لوحة جديدة
            </button>
          </div>
        </div>
      )}
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

const inputStyle: React.CSSProperties = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  width: 220
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gap: 8,
  maxWidth: 640,
  margin: "0 auto"
};

const cardStyle: React.CSSProperties = {
  aspectRatio: "1",
  borderRadius: 12,
  border: "2px solid",
  fontSize: 22,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
};

const scoreRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 14px",
  borderRadius: 12,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  marginBottom: 6,
  maxWidth: 360
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,6,10,.82)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50
};

const overlayCardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 20,
  padding: "36px 44px",
  textAlign: "center"
};
