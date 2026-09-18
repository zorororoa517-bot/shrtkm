"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface Entry {
  login: string;
  displayName: string;
  avatarUrl: string | null;
  coins: number;
  wins: number;
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((data) => setEntries(data.leaderboard));
  }, []);

  useEffect(() => {
    if (!entries.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(".podium-spot", { opacity: 0, y: 60, scale: 0.7 }, { opacity: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.15, ease: "back.out(1.8)" });
      gsap.fromTo(".rank-row", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.05, delay: 0.5, ease: "power2.out" });
    }, rootRef);
    return () => ctx.revert();
  }, [entries.length]);

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="container" ref={rootRef}>
      <h1 style={{ fontSize: 36, fontWeight: 900, textAlign: "center", marginBottom: 40 }}>🏆 المتصدرين</h1>

      {podium.length > 0 && (
        <div style={podiumWrapStyle}>
          {[podium[1], podium[0], podium[2]].map((p, i) =>
            p ? <PodiumSpot key={p.login} entry={p} place={i === 1 ? 1 : i === 0 ? 2 : 3} /> : <div key={i} />
          )}
        </div>
      )}

      <div style={{ marginTop: 50 }}>
        {rest.map((e, i) => (
          <div key={e.login} className="rank-row" style={rowStyle}>
            <span style={{ width: 34, fontWeight: 800, color: "var(--text-dim)" }}>#{i + 4}</span>
            {e.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.avatarUrl} alt="" width={36} height={36} style={{ borderRadius: "50%" }} />
            ) : (
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--surface-2)" }} />
            )}
            <span style={{ flex: 1, fontWeight: 700 }}>{e.displayName}</span>
            <span style={{ color: "var(--accent-2)", fontWeight: 800 }}>{e.wins} 🏆</span>
          </div>
        ))}
        {entries.length === 0 && (
          <p style={{ textAlign: "center", color: "var(--text-dim)" }}>ولا فايز مسجّل بعد — أول فوز يفتح السباق!</p>
        )}
      </div>
    </div>
  );
}

function PodiumSpot({ entry, place }: { entry: Entry; place: 1 | 2 | 3 }) {
  const heights = { 1: 160, 2: 120, 3: 100 } as const;
  const medals = { 1: "🥇", 2: "🥈", 3: "🥉" } as const;
  return (
    <div className="podium-spot" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 30 }}>{medals[place]}</span>
      {entry.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={entry.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: "50%", border: "3px solid var(--accent)" }} />
      ) : (
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--surface-2)" }} />
      )}
      <span style={{ fontWeight: 800, fontSize: 14 }}>{entry.displayName}</span>
      <span style={{ color: "var(--accent-2)", fontSize: 13, fontWeight: 700 }}>{entry.wins} فوز</span>
      <div
        style={{
          width: 90,
          height: heights[place],
          background: "linear-gradient(180deg, var(--surface-2), var(--surface))",
          border: "1px solid var(--border-strong)",
          borderRadius: "12px 12px 0 0",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          paddingTop: 10,
          fontWeight: 900,
          fontSize: 20,
          color: "var(--text-dim)"
        }}
      >
        {place}
      </div>
    </div>
  );
}

const podiumWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  gap: 24
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 14,
  padding: "12px 16px",
  borderRadius: 14,
  background: "var(--surface)",
  border: "1px solid var(--border)",
  marginBottom: 8
};
