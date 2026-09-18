"use client";

import { useEffect, useState } from "react";
import { colorForIndex } from "@/lib/palette";

interface FruitPlayer {
  id: string;
  login: string;
  name: string;
  color: string;
  letter: string;
  isHost: boolean;
  isEliminated: boolean;
  fruitLabel: string;
  fruitEmoji: string;
  votedForId?: string | null;
}
interface FruitBoardItem { playerId: string; label: string; emoji: string; votes: number }
interface FruitWarState {
  code: string;
  status: "LOBBY" | "VOTING" | "FINISHED";
  round: number;
  voteSeconds: number;
  phaseStartAt: string | null;
  winnerId: string | null;
  yourFruit: { label: string; emoji: string } | null;
  fruits: FruitBoardItem[];
  players: FruitPlayer[];
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

export default function FruitWarPage() {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<FruitWarState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const me = room?.players.find((p) => p.login === login) ?? null;

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/fruit-war/rooms/${code}?login=${encodeURIComponent(login)}`)
        .then((r) => r.json())
        .then((data: FruitWarState) => setRoom(data))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 1200);
    return () => clearInterval(id);
  }, [code, login]);

  useEffect(() => {
    if (!room?.phaseStartAt || room.status !== "VOTING") return;
    const start = new Date(room.phaseStartAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.ceil(room.voteSeconds - (Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.phaseStartAt, room?.status, room?.voteSeconds]);

  async function createRoom() {
    if (!name.trim()) return;
    const res = await fetch("/api/fruit-war/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostLogin: login, hostName: name.trim(), hostColor: colorForIndex(0) })
    });
    const data = await res.json();
    if (data.error) return setError("تعذّر إنشاء الغرفة");
    setCode(data.code);
    setRoom(data);
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) return;
    const res = await fetch(`/api/fruit-war/rooms/${joinCode.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, name: name.trim() })
    });
    const data = await res.json();
    if (data.error) return setError(typeof data.error === "string" ? data.error : "تعذّر الانضمام");
    setCode(joinCode.trim().toUpperCase());
    setRoom(data);
  }

  async function startRound() {
    if (!code) return;
    const res = await fetch(`/api/fruit-war/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (data.error) setError(typeof data.error === "string" ? data.error : "خطأ");
    else setRoom(data);
  }

  async function vote(targetPlayerId: string) {
    if (!code) return;
    const res = await fetch(`/api/fruit-war/rooms/${code}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, targetPlayerId })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>🍉 صراع الفواكه</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
          كل واحد ياخذ فاكهة سرية. كل جولة الكل يصوّت لفاكهة يبيها تطلع — وصاحبها يطلع وياها!
        </p>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك..." maxLength={40} style={inputStyle} />
        <button onClick={createRoom} disabled={!name.trim()} style={{ ...btnStyle, marginTop: 12, width: "100%" }}>
          إنشاء غرفة جديدة (مضيف)
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="كود الغرفة" maxLength={6} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={joinRoom} disabled={!name.trim() || !joinCode.trim()} style={btnStyle}>انضم</button>
        </div>
        {error && <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (!room) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  const active = room.players.filter((p) => !p.isEliminated);
  const eliminated = room.players.filter((p) => p.isEliminated);
  const winner = room.players.find((p) => p.id === room.winnerId) ?? null;
  const maxVotes = Math.max(0, ...room.fruits.map((f) => f.votes));

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>🍉 صراع الفواكه</h1>
        <span style={codeChip}>كود الغرفة: {room.code}</span>
      </header>

      {room.status === "FINISHED" && winner && (
        <div style={winnerBox}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: winner.color }}>
            {winner.name} فاز! (كان وراء فاكهة {winner.fruitEmoji} {winner.fruitLabel})
          </h2>
        </div>
      )}

      {room.status === "LOBBY" && (
        <div style={panel}>
          <p style={{ color: "var(--text-dim)" }}>{active.length} مشارك جاهز — لازم اثنين على الأقل للبدء</p>
          {room.yourFruit && (
            <p style={{ marginTop: 10, fontSize: 18 }}>
              فاكهتك السرية: <b>{room.yourFruit.emoji} {room.yourFruit.label}</b> — لا تخبر أحد! 🤫
            </p>
          )}
          {me?.isHost && (
            <button onClick={startRound} disabled={active.length < 2} style={{ ...btnStyle, marginTop: 12 }}>
              {room.round === 0 ? "ابدأ اللعبة" : "جولة تصويت جديدة"}
            </button>
          )}
        </div>
      )}

      {room.status === "VOTING" && (
        <div style={panel}>
          <p style={{ fontSize: 18, fontWeight: 800 }}>⏱️ صوّت للفاكهة اللي تبيها تطلع ({timeLeft}ث)</p>
          {room.yourFruit && (
            <p style={{ color: "var(--text-dim)", marginTop: 4 }}>
              فاكهتك: {room.yourFruit.emoji} {room.yourFruit.label} — احذر ما احد يكشفها!
            </p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12, marginTop: 16 }}>
            {room.fruits.map((f) => {
              const mine = me?.votedForId === f.playerId;
              const leading = f.votes > 0 && f.votes === maxVotes;
              return (
                <button
                  key={f.playerId}
                  onClick={() => vote(f.playerId)}
                  style={{
                    ...fruitCard,
                    borderColor: mine ? "var(--accent-2)" : leading ? "var(--danger)" : "var(--border-strong)"
                  }}
                >
                  <div style={{ fontSize: 32 }}>{f.emoji}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{f.label}</div>
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{f.votes} صوت</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 10, fontSize: 16, color: "var(--text-dim)" }}>المشاركين</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {[...active, ...eliminated].map((p) => (
          <div key={p.id} style={{ ...playerChip, opacity: p.isEliminated ? 0.5 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
            {p.name} {p.isEliminated ? `— طلع (${p.fruitEmoji} ${p.fruitLabel})` : ""}
          </div>
        ))}
      </div>

      {!me && (
        <div style={{ marginTop: 20, display: "flex", gap: 8, maxWidth: 380 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك..." style={inputStyle} />
          <button onClick={joinRoom} style={btnStyle}>انضم للغرفة</button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 15 };
const btnStyle: React.CSSProperties = { padding: "12px 20px", borderRadius: 12, border: "none", background: "var(--accent)", color: "#1a1a1a", fontWeight: 800, fontSize: 15 };
const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 };
const codeChip: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 14 };
const fruitCard: React.CSSProperties = { padding: "14px 8px", borderRadius: 14, border: "2px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", textAlign: "center" };
const playerChip: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 700 };
const winnerBox: React.CSSProperties = { textAlign: "center", padding: "40px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 20 };
