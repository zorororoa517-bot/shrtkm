"use client";

import { useEffect, useMemo, useState } from "react";
import { useRoomPolling } from "@/hooks/useRoomPolling";
import Wheel from "@/components/Wheel";
import JoinPanel from "@/components/JoinPanel";
import PlayerTargetGrid from "@/components/PlayerTargetGrid";
import WinnerOverlay from "@/components/WinnerOverlay";
import { colorForIndex } from "@/lib/palette";

function getOrCreateLogin(): string {
  const KEY = "dawwar_login";
  let v = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
  if (!v) {
    v = `guest_${Math.random().toString(36).slice(2, 10)}`;
    if (typeof window !== "undefined") localStorage.setItem(KEY, v);
  }
  return v;
}

export default function RoulettePage() {
  const [login] = useState(getOrCreateLogin);
  const [code, setCode] = useState<string | null>(null);
  const [joinCodeInput, setJoinCodeInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [spinRequest, setSpinRequest] = useState<{ targetIndex: number; nonce: number } | null>(null);
  const [revealTurn, setRevealTurn] = useState(false);
  const [mode, setMode] = useState<"eliminate" | "revive">("eliminate");

  const { room, error, refresh, setRoom } = useRoomPolling(code);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("dawwar_room_code") : null;
    if (stored) setCode(stored);
  }, []);

  const me = useMemo(() => room?.players.find((p) => p.login === login) ?? null, [room, login]);
  const activePlayers = useMemo(() => room?.players.filter((p) => !p.isEliminated) ?? [], [room]);
  const isMyTurn = !!(me && room?.currentTurn?.id === me.id);
  const canAct = isMyTurn || !!me?.isHost;

  async function createRoom() {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostLogin: login, hostName: "المضيف", hostColor: colorForIndex(0) })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "فشل الإنشاء");
      localStorage.setItem("dawwar_room_code", data.code);
      setCode(data.code);
      setRoom(data);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function joinExistingRoom() {
    const c = joinCodeInput.trim().toUpperCase();
    if (!c) return;
    localStorage.setItem("dawwar_room_code", c);
    setCode(c);
  }

  async function handleJoin(name: string) {
    if (!code) return;
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/rooms/${code}/players`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, name })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الانضمام");
      setRoom(data);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleSpin() {
    if (!code) return;
    setRevealTurn(false);
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}/spin`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر التدوير");
      setRoom(data);
      setSpinRequest({ targetIndex: data.spinTargetIndex, nonce: Date.now() });
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleEliminate(targetId: string) {
    if (!code || !me) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}/eliminate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: room?.currentTurn?.id, targetId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الطرد");
      setRoom(data);
      setRevealTurn(false);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevive(targetId: string) {
    if (!code || !room?.currentTurn) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/rooms/${code}/revive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actorId: room.currentTurn.id, targetId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الإنعاش");
      setRoom(data);
      setRevealTurn(false);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusy(false);
    }
  }

  async function handleRestart() {
    localStorage.removeItem("dawwar_room_code");
    setCode(null);
    setRoom(null);
    setSpinRequest(null);
    setRevealTurn(false);
  }

  // ---- No room yet: create or join ----
  if (!code) {
    return (
      <div className="container" style={{ maxWidth: 480, textAlign: "center" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900 }}>🎯 عجلة الشخصنة</h1>
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>سوّي غرفة جديدة أو ادخل بكود موجود</p>
        <button onClick={createRoom} disabled={busy} style={primaryBtn}>
          ➕ إنشاء غرفة جديدة
        </button>
        <div style={{ margin: "20px 0", color: "var(--text-dim)" }}>— أو —</div>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={joinCodeInput}
            onChange={(e) => setJoinCodeInput(e.target.value)}
            placeholder="كود الغرفة"
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)" }}
          />
          <button onClick={joinExistingRoom} style={primaryBtn}>
            دخول
          </button>
        </div>
        {notice && <p style={{ color: "var(--danger)", marginTop: 16 }}>{notice}</p>}
      </div>
    );
  }

  if (error) {
    return (
      <div className="container" style={{ textAlign: "center" }}>
        <p style={{ color: "var(--danger)" }}>{error}</p>
        <button onClick={handleRestart} style={primaryBtn}>ابدأ من جديد</button>
      </div>
    );
  }

  if (!room) {
    return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;
  }

  // ---- In a room, not joined yet ----
  if (!me) {
    return (
      <div className="container" style={{ textAlign: "center" }}>
        <h2>غرفة {room.code}</h2>
        <p style={{ color: "var(--text-dim)" }}>{room.activeCount} مشارك بالعجلة الحين</p>
        <JoinPanel onJoin={handleJoin} busy={busy} />
      </div>
    );
  }

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>🎯 عجلة الشخصنة — غرفة {room.code}</h2>
        <span style={{ color: "var(--text-dim)", fontSize: 14 }}>
          {room.activeCount} نشط · {room.eliminatedCount} مطرود
        </span>
      </div>

      <Wheel
        players={activePlayers}
        spinRequest={spinRequest}
        spinSeconds={room.spinSeconds}
        onSpinComplete={() => setRevealTurn(true)}
      />

      <div style={{ textAlign: "center", marginTop: 24 }}>
        {me.isHost && room.status === "LOBBY" && room.activeCount >= 2 && (
          <button onClick={handleSpin} disabled={busy} style={primaryBtn}>
            🎡 دوّر العجلة
          </button>
        )}

        {room.currentTurn && (
          <p style={{ fontWeight: 800, fontSize: 18, marginTop: 12 }}>
            🎯 دور <b>{room.currentTurn.name}</b>
            {room.currentTurn.hasDoubleElim && (
              <span style={{ marginInlineStart: 8, fontSize: 12, fontWeight: 900, padding: "3px 10px", borderRadius: 999, background: "linear-gradient(135deg,#ffe08a,#ffb300)", color: "#4a2e00" }}>
                ⚡x2 دبل
              </span>
            )}
            !
          </p>
        )}
      </div>

      {revealTurn && room.status === "AWAITING_TARGET" && canAct && (
        <div style={{ marginTop: 28, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 20, padding: 24 }}>
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}>
            <button onClick={() => setMode("eliminate")} style={mode === "eliminate" ? tabActive : tabInactive}>
              🔪 طرد
            </button>
            {room.revivePhaseActive && (
              <button onClick={() => setMode("revive")} style={mode === "revive" ? tabActive : tabInactive}>
                💉 إنعاش
              </button>
            )}
          </div>
          <PlayerTargetGrid
            players={room.players}
            mode={mode}
            disabled={busy}
            onPick={mode === "eliminate" ? handleEliminate : handleRevive}
          />
        </div>
      )}

      {notice && <p style={{ color: "var(--danger)", textAlign: "center", marginTop: 12 }}>{notice}</p>}

      {room.status === "FINISHED" && room.lastWinner && (
        <WinnerOverlay
          winner={
            room.players.find((p) => p.name === room.lastWinner!.name) ?? {
              id: "?",
              login: "?",
              name: room.lastWinner.name,
              color: "#e8a00f",
              letter: room.lastWinner.name.charAt(0),
              isHost: false,
              isEliminated: false,
              hasRevived: false,
              wasRevived: false,
              hasDoubleElim: true,
              canRevive: false
            }
          }
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: "14px 26px",
  borderRadius: 14,
  border: "none",
  background: "var(--accent)",
  color: "#1a1a1a",
  fontWeight: 800,
  fontSize: 16
};

const tabActive: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 999,
  border: "none",
  background: "var(--accent)",
  color: "#1a1a1a",
  fontWeight: 800
};

const tabInactive: React.CSSProperties = {
  padding: "8px 18px",
  borderRadius: 999,
  border: "1px solid var(--border-strong)",
  background: "transparent",
  color: "var(--text-dim)",
  fontWeight: 700
};
