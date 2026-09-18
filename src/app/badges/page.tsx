"use client";

import { useEffect, useState } from "react";

interface BadgeRow { id: string; title: string; desc: string; icon: string; manual?: boolean; earned?: boolean }
interface BadgesResponse {
  level: { level: number; into: number; need: number; pct: number };
  stats: { wins: number; hosted: number; streak: number; spent: number };
  earned: BadgeRow[];
  all: BadgeRow[];
}

export default function BadgesPage() {
  const [data, setData] = useState<BadgesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/badges")
      .then((r) => r.json())
      .then((d) => (d.error ? setError(d.error) : setData(d)))
      .catch(() => setError("تعذّر التحميل"));
  }, []);

  if (error) {
    return (
      <div className="container" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>🏅 الشارات</h1>
        <p style={{ color: "var(--text-dim)" }}>{error}</p>
      </div>
    );
  }
  if (!data) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  return (
    <div className="container">
      <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 20 }}>🏅 الشارات والمستوى</h1>

      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: 20, marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontWeight: 800 }}>المستوى {data.level.level}</span>
          <span style={{ color: "var(--text-dim)", fontSize: 13 }}>{data.level.into} / {data.level.need} XP</span>
        </div>
        <div style={{ height: 10, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${data.level.pct}%`, height: "100%", background: "var(--accent)" }} />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 14, flexWrap: "wrap", fontSize: 13, color: "var(--text-dim)" }}>
          <span>🏆 {data.stats.wins} فوز</span>
          <span>🎪 {data.stats.hosted} استضافة</span>
          <span>📅 {data.stats.streak} يوم متتالي</span>
          <span>🪙 {data.stats.spent} نقطة مصروفة</span>
        </div>
      </div>

      <h3 style={{ marginBottom: 10, color: "var(--text-dim)" }}>شاراتك ({data.earned.length})</h3>
      {data.earned.length === 0 ? (
        <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>ما فيه شارات بعد — إلعب واستضف وسجّل دخولك يومياً عشان تجمعها 🏅</p>
      ) : (
        <div style={grid}>
          {data.earned.map((b) => (
            <div key={b.id} style={badgeCard}>
              <div style={{ fontSize: 32 }}>{b.icon}</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>{b.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{b.desc}</div>
            </div>
          ))}
        </div>
      )}

      <h3 style={{ margin: "28px 0 10px", color: "var(--text-dim)" }}>كل الشارات</h3>
      <div style={grid}>
        {data.all.map((b) => (
          <div key={b.id} style={{ ...badgeCard, opacity: b.earned ? 1 : 0.4 }}>
            <div style={{ fontSize: 32 }}>{b.earned ? b.icon : "🔒"}</div>
            <div style={{ fontWeight: 800, marginTop: 6 }}>{b.title}</div>
            <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{b.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12 };
const badgeCard: React.CSSProperties = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, textAlign: "center" };
