"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { colorForIndex } from "@/lib/palette";

interface SwordPlayer {
  id: string;
  login: string;
  name: string;
  color: string;
  letter: string;
  isHost: boolean;
  isEliminated: boolean;
  power: number;
}
interface SwordState {
  code: string;
  status: "LOBBY" | "BATTLE" | "FINISHED";
  round: number;
  battleSeconds: number;
  phaseStartAt: string | null;
  winnerId: string | null;
  players: SwordPlayer[];
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

export default function SwordClashPage() {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<SwordState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const swordBtnRef = useRef<HTMLButtonElement>(null);

  const me = room?.players.find((p) => p.login === login) ?? null;

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/sword-clash/rooms/${code}`)
        .then((r) => r.json())
        .then((data: SwordState) => setRoom(data))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 900);
    return () => clearInterval(id);
  }, [code]);

  useEffect(() => {
    if (!room?.phaseStartAt || room.status !== "BATTLE") return;
    const start = new Date(room.phaseStartAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.ceil(room.battleSeconds - (Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [room?.phaseStartAt, room?.status, room?.battleSeconds]);

  async function createRoom() {
    if (!name.trim()) return;
    const res = await fetch("/api/sword-clash/rooms", {
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
    const res = await fetch(`/api/sword-clash/rooms/${joinCode.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, name: name.trim() })
    });
    const data = await res.json();
    if (data.error) return setError(typeof data.error === "string" ? data.error : "تعذّر الانضمام");
    setCode(joinCode.trim().toUpperCase());
    setRoom(data);
  }

  async function startBattle() {
    if (!code) return;
    const res = await fetch(`/api/sword-clash/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (data.error) setError(typeof data.error === "string" ? data.error : "خطأ");
    else setRoom(data);
  }

  async function strike() {
    if (!code) return;
    if (swordBtnRef.current) {
      gsap.fromTo(swordBtnRef.current, { rotate: -20, scale: 1.1 }, { rotate: 0, scale: 1, duration: 0.25, ease: "back.out(3)" });
    }
    const res = await fetch(`/api/sword-clash/rooms/${code}/strike`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>⚔️ تصادم السيوف</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
          كل معركة اضرب بأسرع ما تقدر عشان تجمع قوة — الأضعف يطلع من الحلبة!
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
  const winner = room.players.find((p) => p.id === room.winnerId) ?? null;
  const maxPower = Math.max(1, ...active.map((p) => p.power));

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>⚔️ تصادم السيوف</h1>
        <span style={codeChip}>كود الغرفة: {room.code}</span>
      </header>

      {room.status === "FINISHED" && winner && (
        <div style={winnerBox}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: winner.color }}>{winner.name} فاز بالمعركة!</h2>
        </div>
      )}

      {room.status === "LOBBY" && (
        <div style={panel}>
          <p style={{ color: "var(--text-dim)" }}>{active.length} مقاتل جاهز — لازم اثنين على الأقل للبدء</p>
          {me?.isHost && (
            <button onClick={startBattle} disabled={active.length < 2} style={{ ...btnStyle, marginTop: 12 }}>
              {room.round === 0 ? "ابدأ المعركة" : "المعركة الجاية"}
            </button>
          )}
        </div>
      )}

      {room.status === "BATTLE" && (
        <div style={{ ...panel, textAlign: "center" }}>
          <p style={{ fontSize: 20, fontWeight: 800 }}>⏱️ اضرب بسرعة! ({timeLeft}ث)</p>
          {me && !me.isEliminated && (
            <button ref={swordBtnRef} onClick={strike} style={swordBigBtn}>⚔️ اضرب</button>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20, maxWidth: 420, marginInline: "auto" }}>
            {[...active].sort((a, b) => b.power - a.power).map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 70, fontSize: 13, fontWeight: 700, textAlign: "right" }}>{p.name}</span>
                <div style={{ flex: 1, height: 14, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
                  <div style={{ width: `${(p.power / maxPower) * 100}%`, height: "100%", background: p.color, transition: "width .2s" }} />
                </div>
                <span style={{ fontSize: 12, color: "var(--text-dim)", width: 24 }}>{p.power}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 10, fontSize: 16, color: "var(--text-dim)" }}>المقاتلين</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {room.players.map((p) => (
          <div key={p.id} style={{ ...playerChip, opacity: p.isEliminated ? 0.4 : 1 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
            {p.name} {p.isEliminated ? "(طلع)" : ""}
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
const swordBigBtn: React.CSSProperties = { marginTop: 16, padding: "22px 50px", borderRadius: 20, border: "none", background: "linear-gradient(135deg, var(--accent), #ffd873)", color: "#1a1a1a", fontWeight: 900, fontSize: 26 };
const playerChip: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 700 };
const winnerBox: React.CSSProperties = { textAlign: "center", padding: "40px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 20 };
