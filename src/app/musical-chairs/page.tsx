"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { colorForIndex } from "@/lib/palette";

interface ChairsPlayer {
  id: string;
  login: string;
  name: string;
  color: string;
  letter: string;
  isHost: boolean;
  isEliminated: boolean;
  claimedChair: number | null;
}
interface ChairsState {
  code: string;
  status: "LOBBY" | "MOVING" | "CLAIMING" | "FINISHED";
  round: number;
  moveSeconds: number;
  claimSeconds: number;
  phaseStartAt: string | null;
  winnerId: string | null;
  chairNumbers: number[];
  availableNumbers: number[];
  players: ChairsPlayer[];
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

export default function MusicalChairsPage() {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<ChairsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const me = room?.players.find((p) => p.login === login) ?? null;

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/chairs/rooms/${code}`)
        .then((r) => r.json())
        .then((data: ChairsState | { error: string }) =>
          "error" in data ? setError(data.error) : setRoom(data)
        )
        .catch(() => {});
    poll();
    const id = setInterval(poll, 1200);
    return () => clearInterval(id);
  }, [code]);

  useEffect(() => {
    if (!room?.phaseStartAt || (room.status !== "MOVING" && room.status !== "CLAIMING")) return;
    const start = new Date(room.phaseStartAt).getTime();
    const total = room.status === "MOVING" ? room.moveSeconds : room.claimSeconds;
    const tick = () => setTimeLeft(Math.max(0, Math.ceil(total - (Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.phaseStartAt, room?.status, room?.moveSeconds, room?.claimSeconds]);

  useEffect(() => {
    if (room?.status === "MOVING" && stageRef.current) {
      gsap.to(stageRef.current.querySelectorAll(".chair-avatar"), {
        rotation: 360,
        duration: 2,
        repeat: -1,
        ease: "none",
        transformOrigin: "50% 140px"
      });
    }
  }, [room?.status]);

  async function createRoom() {
    if (!name.trim()) return;
    const res = await fetch("/api/chairs/rooms", {
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
    const res = await fetch(`/api/chairs/rooms/${joinCode.trim().toUpperCase()}/join`, {
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
    const res = await fetch(`/api/chairs/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (data.error) setError(typeof data.error === "string" ? data.error : "خطأ");
    else setRoom(data);
  }

  async function claim(chairNumber: number) {
    if (!code) return;
    const res = await fetch(`/api/chairs/rooms/${code}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, chairNumber })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>🪑 الكراسي الموسيقية</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
          الموسيقى تشتغل والكل يدور... توقف الموسيقى، اكتب رقم كرسيك بسرعة قبل ما يفوتك!
        </p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="اسمك..."
          maxLength={40}
          style={inputStyle}
        />
        <button onClick={createRoom} disabled={!name.trim()} style={{ ...btnStyle, marginTop: 12, width: "100%" }}>
          إنشاء غرفة جديدة (مضيف)
        </button>
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="كود الغرفة"
            maxLength={6}
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={joinRoom} disabled={!name.trim() || !joinCode.trim()} style={btnStyle}>
            انضم
          </button>
        </div>
        {error && <p style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p>}
      </div>
    );
  }

  if (!room) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  const active = room.players.filter((p) => !p.isEliminated);
  const winner = room.players.find((p) => p.id === room.winnerId) ?? null;

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>🪑 الكراسي الموسيقية</h1>
        <span style={codeChip}>كود الغرفة: {room.code}</span>
      </header>

      {room.status === "FINISHED" && winner && (
        <div style={winnerBox}>
          <div style={{ fontSize: 48 }}>🏆</div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: winner.color }}>{winner.name} فاز باللعبة!</h2>
        </div>
      )}

      {room.status === "LOBBY" && (
        <div style={panel}>
          <p style={{ color: "var(--text-dim)" }}>{active.length} مشارك جاهز — لازم اثنين على الأقل للبدء</p>
          {me?.isHost && (
            <button onClick={startRound} disabled={active.length < 2} style={{ ...btnStyle, marginTop: 12 }}>
              {room.round === 0 ? "ابدأ اللعبة" : "الجولة الجاية"}
            </button>
          )}
        </div>
      )}

      {room.status === "MOVING" && (
        <div ref={stageRef} style={{ ...panel, textAlign: "center", position: "relative", minHeight: 220 }}>
          <p style={{ fontSize: 20, fontWeight: 800 }}>🎶 دورو حول الكراسي! ({active.length - 1} كرسي)</p>
          <div style={{ fontSize: 40, fontWeight: 900, color: "var(--accent)" }}>{timeLeft}</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginTop: 20 }}>
            {active.map((p) => (
              <div
                key={p.id}
                className="chair-avatar"
                style={{ ...avatarCircle, background: p.color }}
                title={p.name}
              >
                {p.letter}
              </div>
            ))}
          </div>
        </div>
      )}

      {room.status === "CLAIMING" && (
        <div style={panel}>
          <p style={{ fontSize: 18, fontWeight: 800 }}>⏱️ اختر رقم كرسي بسرعة! ({timeLeft}ث)</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
            {room.chairNumbers.map((n) => {
              const taken = !room.availableNumbers.includes(n);
              const mine = me?.claimedChair === n;
              return (
                <button
                  key={n}
                  onClick={() => claim(n)}
                  disabled={taken || !!me?.claimedChair || !!me?.isEliminated}
                  style={{
                    ...chairBtn,
                    opacity: taken && !mine ? 0.35 : 1,
                    borderColor: mine ? "var(--accent-2)" : "var(--border-strong)"
                  }}
                >
                  🪑 {n}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 10, fontSize: 16, color: "var(--text-dim)" }}>المشاركين</h3>
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
          <button onClick={joinRoom} style={btnStyle}>
            انضم للغرفة
          </button>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontSize: 15
};
const btnStyle: React.CSSProperties = {
  padding: "12px 20px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent)",
  color: "#1a1a1a",
  fontWeight: 800,
  fontSize: 15
};
const panel: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: 24
};
const codeChip: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  borderRadius: 999,
  padding: "8px 16px",
  fontWeight: 800,
  fontSize: 14
};
const avatarCircle: React.CSSProperties = {
  width: 56,
  height: 56,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 20,
  color: "#1a1a1a"
};
const chairBtn: React.CSSProperties = {
  padding: "14px 22px",
  borderRadius: 12,
  border: "2px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontWeight: 800,
  fontSize: 18
};
const playerChip: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  borderRadius: 999,
  background: "var(--surface-2)",
  border: "1px solid var(--border)",
  fontSize: 13,
  fontWeight: 700
};
const winnerBox: React.CSSProperties = {
  textAlign: "center",
  padding: "40px 20px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  marginBottom: 20
};
