"use client";

import { useEffect, useRef, useState } from "react";
import { colorForIndex } from "@/lib/palette";

interface StrokePoint { x: number; y: number }
interface Stroke { points: StrokePoint[]; color: string; width: number }
interface DrawingPlayerRow { id: string; login: string; name: string; color: string; letter: string; isHost: boolean; score: number }
interface DrawingState {
  code: string;
  status: "LOBBY" | "CHOOSING" | "DRAWING" | "FINISHED";
  round: number;
  roundLimit: number;
  drawSeconds: number;
  chooseSeconds: number;
  phaseStartAt: string | null;
  drawerLogin: string | null;
  drawerName: string | null;
  isDrawer: boolean;
  wordChoices: string[];
  wordLength: number;
  word: string | null;
  strokes: Stroke[];
  hasGuessedCorrectly: boolean;
  correctCount: number;
  players: DrawingPlayerRow[];
}

const CANVAS_W = 600;
const CANVAS_H = 400;
const COLORS = ["#1a1a1a", "#f2495b", "#3ecf6e", "#5b9df0", "#e8a00f", "#b985f4", "#ffffff"];

function getOrCreateLogin(): string {
  const KEY = "dawwar_login";
  let v = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (!v) {
    v = `guest_${Math.random().toString(36).slice(2, 10)}`;
    if (typeof window !== "undefined") localStorage.setItem(KEY, v);
  }
  return v;
}

function redraw(canvas: HTMLCanvasElement, strokes: Stroke[]) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  for (const s of strokes) {
    if (s.points.length < 2) continue;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.width;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(s.points[0]!.x, s.points[0]!.y);
    for (const p of s.points.slice(1)) ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
}

export default function DrawingChallengePage() {
  const [login] = useState(getOrCreateLogin);
  const [name, setName] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState<DrawingState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [guess, setGuess] = useState("");
  const [color, setColor] = useState(COLORS[0]!);
  const [width, setWidth] = useState(4);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const currentStrokeRef = useRef<StrokePoint[]>([]);

  useEffect(() => {
    if (!code) return;
    const poll = () =>
      fetch(`/api/drawing/rooms/${code}?login=${encodeURIComponent(login)}`)
        .then((r) => r.json())
        .then((data: DrawingState) => setRoom(data))
        .catch(() => {});
    poll();
    const id = setInterval(poll, 900);
    return () => clearInterval(id);
  }, [code, login]);

  useEffect(() => {
    if (!room) return;
    const total = room.status === "CHOOSING" ? room.chooseSeconds : room.drawSeconds;
    if (!room.phaseStartAt || (room.status !== "CHOOSING" && room.status !== "DRAWING")) return;
    const start = new Date(room.phaseStartAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.ceil(total - (Date.now() - start) / 1000)));
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [room?.phaseStartAt, room?.status, room?.drawSeconds, room?.chooseSeconds]);

  useEffect(() => {
    if (!canvasRef.current || !room) return;
    redraw(canvasRef.current, room.strokes);
  }, [room?.strokes]);

  function posFromEvent(e: React.PointerEvent<HTMLCanvasElement>): StrokePoint {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * CANVAS_W, y: ((e.clientY - rect.top) / rect.height) * CANVAS_H };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!room?.isDrawer || room.status !== "DRAWING") return;
    drawingRef.current = true;
    currentStrokeRef.current = [posFromEvent(e)];
  }
  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current || !canvasRef.current) return;
    const p = posFromEvent(e);
    currentStrokeRef.current.push(p);
    const ctx = canvasRef.current.getContext("2d");
    const pts = currentStrokeRef.current;
    if (ctx && pts.length >= 2) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(pts[pts.length - 2]!.x, pts[pts.length - 2]!.y);
      ctx.lineTo(pts[pts.length - 1]!.x, pts[pts.length - 1]!.y);
      ctx.stroke();
    }
  }
  async function handlePointerUp() {
    if (!drawingRef.current || !code) return;
    drawingRef.current = false;
    const pts = currentStrokeRef.current;
    currentStrokeRef.current = [];
    if (pts.length < 2) return;
    const res = await fetch(`/api/drawing/rooms/${code}/stroke`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, stroke: { points: pts, color, width } })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  async function clearCanvas() {
    if (!code) return;
    const res = await fetch(`/api/drawing/rooms/${code}/clear`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  async function createRoom() {
    if (!name.trim()) return;
    const res = await fetch("/api/drawing/rooms", {
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
    const res = await fetch(`/api/drawing/rooms/${joinCode.trim().toUpperCase()}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, name: name.trim() })
    });
    const data = await res.json();
    if (data.error) return setError(typeof data.error === "string" ? data.error : "تعذّر الانضمام");
    setCode(joinCode.trim().toUpperCase());
    setRoom(data);
  }

  async function startGame() {
    if (!code) return;
    const res = await fetch(`/api/drawing/rooms/${code}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login })
    });
    const data = await res.json();
    if (data.error) setError(typeof data.error === "string" ? data.error : "خطأ");
    else setRoom(data);
  }

  async function chooseWord(word: string) {
    if (!code) return;
    const res = await fetch(`/api/drawing/rooms/${code}/choose-word`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, word })
    });
    const data = await res.json();
    if (!data.error) setRoom(data);
  }

  async function submitGuess() {
    if (!code || !guess.trim()) return;
    const res = await fetch(`/api/drawing/rooms/${code}/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, text: guess.trim() })
    });
    const data = await res.json();
    setGuess("");
    if (!data.error) setRoom(data);
  }

  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 420 }}>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 8 }}>🎨 تحدي الرسم</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
          واحد يرسم والباقي يخمنون الكلمة — الدور يتناوب على كل اللاعبين!
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
  const me = room.players.find((p) => p.login === login) ?? null;

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>🎨 تحدي الرسم</h1>
        <span style={codeChip}>كود الغرفة: {room.code}</span>
      </header>

      {room.status === "LOBBY" && (
        <div style={panel}>
          <p style={{ color: "var(--text-dim)" }}>{room.players.length} لاعب — لازم اثنين على الأقل للبدء</p>
          {me?.isHost && (
            <button onClick={startGame} disabled={room.players.length < 2} style={{ ...btnStyle, marginTop: 12 }}>ابدأ اللعبة</button>
          )}
        </div>
      )}

      {room.status === "FINISHED" && (
        <div style={winnerBox}>
          <div style={{ fontSize: 48 }}>🏁</div>
          <h2 style={{ fontSize: 22, fontWeight: 900 }}>خلصت اللعبة!</h2>
          {room.players[0] && (
            <p style={{ fontSize: 18, color: room.players[0].color, fontWeight: 800 }}>
              🏆 {room.players[0].name} — {room.players[0].score} نقطة
            </p>
          )}
          {me?.isHost && <button onClick={startGame} style={{ ...btnStyle, marginTop: 12 }}>العب مرة ثانية</button>}
        </div>
      )}

      {room.status === "CHOOSING" && (
        <div style={panel}>
          {room.isDrawer ? (
            <>
              <p style={{ fontWeight: 800, marginBottom: 12 }}>دورك ترسم! اختر كلمة ({timeLeft}ث):</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {room.wordChoices.map((w) => (
                  <button key={w} onClick={() => chooseWord(w)} style={{ ...btnStyle, background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border-strong)" }}>
                    {w}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p style={{ fontSize: 18, fontWeight: 700 }}>⏳ {room.drawerName} يختار كلمة... ({timeLeft}ث)</p>
          )}
        </div>
      )}

      {room.status === "DRAWING" && (
        <div style={panel}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <p style={{ fontWeight: 800 }}>
              {room.isDrawer ? `ارسم: ${room.word}` : `${room.drawerName} يرسم — الكلمة: ${"_ ".repeat(room.wordLength)}`}
            </p>
            <p style={{ fontWeight: 800, color: "var(--accent)" }}>⏱️ {timeLeft}ث · {room.correctCount} خمّنوا صح</p>
          </div>

          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            style={{ width: "100%", maxWidth: 600, aspectRatio: `${CANVAS_W}/${CANVAS_H}`, background: "#fff", borderRadius: 12, touchAction: "none", cursor: room.isDrawer ? "crosshair" : "default" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          />

          {room.isDrawer && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid var(--accent)" : "1px solid var(--border-strong)" }}
                />
              ))}
              <button onClick={() => setWidth(3)} style={{ ...smallBtn, fontWeight: width === 3 ? 900 : 500 }}>رفيع</button>
              <button onClick={() => setWidth(9)} style={{ ...smallBtn, fontWeight: width === 9 ? 900 : 500 }}>غليظ</button>
              <button onClick={clearCanvas} style={smallBtn}>🗑️ امسح الكل</button>
            </div>
          )}

          {!room.isDrawer && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <input
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitGuess()}
                placeholder={room.hasGuessedCorrectly ? "خمّنت صح! ✅" : "اكتب تخمينك..."}
                disabled={room.hasGuessedCorrectly}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={submitGuess} disabled={room.hasGuessedCorrectly || !guess.trim()} style={btnStyle}>خمّن</button>
            </div>
          )}
        </div>
      )}

      <h3 style={{ marginTop: 28, marginBottom: 10, fontSize: 16, color: "var(--text-dim)" }}>لوحة النقاط</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        {room.players.map((p) => (
          <div key={p.id} style={playerChip}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
            {p.name} — {p.score} نقطة
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
const smallBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 13 };
const panel: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 24 };
const codeChip: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 14 };
const playerChip: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999, background: "var(--surface-2)", border: "1px solid var(--border)", fontSize: 13, fontWeight: 700 };
const winnerBox: React.CSSProperties = { textAlign: "center", padding: "40px 20px", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", marginBottom: 20 };
