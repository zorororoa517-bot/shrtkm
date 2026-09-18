"use client";

import { useEffect, useState } from "react";

interface RoomRow { gameType: string; gameLabel: string; code: string; status: string; playerCount: number; createdAt: string }
interface UserRow { login: string; displayName: string; coins: number; isAdmin: boolean; specialBadges: string[]; currentStreak: number }

const MANUAL_BADGES = [
  { id: "owner", label: "👑 مالك" },
  { id: "verified", label: "✅ موثّق" },
  { id: "staff", label: "🛡️ فريق العمل" },
  { id: "vip", label: "💎 VIP" },
  { id: "bug_hunter", label: "🐞 مكتشف مشاكل" },
  { id: "suggester", label: "💡 صاحب اقتراح" }
];

export default function AdminPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadRooms() {
    const res = await fetch("/api/admin/rooms");
    const data = await res.json();
    if (data.error) return setAllowed(false);
    setAllowed(true);
    setRooms(data.rooms);
    setUserCount(data.userCount);
  }
  async function loadUsers(q = "") {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    if (!data.error) setUsers(data.users);
  }

  useEffect(() => {
    loadRooms();
    loadUsers();
  }, []);

  async function endRoom(gameType: string, code: string) {
    if (!confirm(`متأكد تبي تنهي الغرفة ${code}؟`)) return;
    const res = await fetch("/api/admin/rooms/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameType, code })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else loadRooms();
  }

  async function toggleBadge(login: string, badgeId: string, grant: boolean) {
    await fetch("/api/admin/users/badge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, badgeId, grant })
    });
    loadUsers(query);
  }

  async function toggleAdmin(login: string, isAdmin: boolean) {
    const res = await fetch("/api/admin/users/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, isAdmin })
    });
    const data = await res.json();
    if (data.error) setError(data.error);
    else loadUsers(query);
  }

  async function adjustCoins(login: string, delta: number) {
    await fetch("/api/admin/users/coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, delta })
    });
    loadUsers(query);
  }

  if (allowed === null) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;
  if (!allowed) {
    return (
      <div className="container" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>🔒 لوحة الأدمن</h1>
        <p style={{ color: "var(--text-dim)" }}>ما عندك صلاحية توصل لهالصفحة.</p>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>🛠️ لوحة الأدمن</h1>
      {error && <p style={{ color: "var(--danger)", marginBottom: 12 }}>{error}</p>}

      <section style={{ marginBottom: 32 }}>
        <h3 style={{ marginBottom: 10, color: "var(--text-dim)" }}>الغرف النشطة (آخر {rooms.length}) — {userCount} مستخدم مسجّل إجمالاً</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rooms.map((r) => (
            <div key={`${r.gameType}-${r.code}`} style={row}>
              <span style={{ minWidth: 140, fontWeight: 700 }}>{r.gameLabel}</span>
              <span style={codeTag}>{r.code}</span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{r.status}</span>
              <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{r.playerCount} لاعب</span>
              <button onClick={() => endRoom(r.gameType, r.code)} style={dangerBtn}>إنهاء</button>
            </div>
          ))}
          {rooms.length === 0 && <p style={{ color: "var(--text-dim)" }}>ما فيه غرف حالياً.</p>}
        </div>
      </section>

      <section>
        <h3 style={{ marginBottom: 10, color: "var(--text-dim)" }}>إدارة المستخدمين</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, maxWidth: 320 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers(query)}
            placeholder="ابحث بيوزر تويتش..."
            style={inputStyle}
          />
          <button onClick={() => loadUsers(query)} style={smallBtn}>بحث</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {users.map((u) => (
            <div key={u.login} style={userCard}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <b>{u.displayName}</b> <span style={{ color: "var(--text-dim)", fontSize: 13 }}>@{u.login}</span>
                </div>
                <div style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-dim)" }}>
                  <span>🪙 {u.coins}</span>
                  <span>📅 {u.currentStreak} يوم</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                {MANUAL_BADGES.map((b) => {
                  const has = u.specialBadges.includes(b.id);
                  return (
                    <button key={b.id} onClick={() => toggleBadge(u.login, b.id, !has)} style={{ ...badgeToggle, opacity: has ? 1 : 0.4 }}>
                      {b.label}
                    </button>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, flexWrap: "wrap" }}>
                <button onClick={() => toggleAdmin(u.login, !u.isAdmin)} style={{ ...smallBtn, background: u.isAdmin ? "var(--danger)" : "var(--accent)" }}>
                  {u.isAdmin ? "سحب صلاحية الأدمن" : "خلّه أدمن"}
                </button>
                <button onClick={() => adjustCoins(u.login, 100)} style={smallBtn}>+100 🪙</button>
                <button onClick={() => adjustCoins(u.login, -100)} style={smallBtn}>-100 🪙</button>
              </div>
            </div>
          ))}
          {users.length === 0 && <p style={{ color: "var(--text-dim)" }}>ما فيه نتائج.</p>}
        </div>
      </section>
    </div>
  );
}

const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 12, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", flexWrap: "wrap" };
const codeTag: React.CSSProperties = { background: "var(--surface-2)", borderRadius: 999, padding: "2px 10px", fontWeight: 700, fontSize: 12 };
const dangerBtn: React.CSSProperties = { marginInlineStart: "auto", padding: "6px 14px", borderRadius: 8, border: "none", background: "var(--danger)", color: "#fff", fontWeight: 700, fontSize: 12 };
const inputStyle: React.CSSProperties = { flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)" };
const smallBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 10, border: "none", background: "var(--surface-2)", color: "var(--text)", fontWeight: 700, fontSize: 13 };
const badgeToggle: React.CSSProperties = { padding: "6px 10px", borderRadius: 999, border: "1px solid var(--border-strong)", background: "var(--surface-2)", color: "var(--text)", fontSize: 12 };
const userCard: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 14 };
