"use client";

import type { ClientPlayer } from "@/types/room";

interface Props {
  players: ClientPlayer[];
  mode: "eliminate" | "revive";
  onPick: (playerId: string) => void;
  disabled?: boolean;
}

export default function PlayerTargetGrid({ players, mode, onPick, disabled }: Props) {
  const pool = mode === "eliminate" ? players.filter((p) => !p.isEliminated) : players.filter((p) => p.isEliminated);

  if (pool.length === 0) {
    return <p style={{ color: "var(--text-dim)", textAlign: "center" }}>ما فيه أهداف متاحة حالياً</p>;
  }

  return (
    <div style={gridStyle}>
      {pool.map((p) => (
        <button
          key={p.id}
          disabled={disabled}
          onClick={() => onPick(p.id)}
          style={{ ...cardStyle, borderColor: p.color }}
        >
          <span style={{ ...avatarStyle, background: p.color }}>{p.letter}</span>
          {/* الاسم يبان كامل دايماً — يلف على أكثر من سطر بدل ما ينقطع بـ "..." */}
          <span style={nameStyle}>{p.name}</span>
          {p.hasDoubleElim && mode === "eliminate" && (
            <span style={badgeStyle} title="عنده طردة دبل هالدور">
              ⚡x2 دبل
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
  gap: 12,
  width: "100%"
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 8,
  padding: "14px 10px",
  borderRadius: 14,
  border: "2px solid",
  background: "var(--surface-2)",
  color: "var(--text)",
  transition: "transform .15s ease, box-shadow .15s ease"
};

const avatarStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 900,
  fontSize: 18,
  color: "#1a1a1a"
};

const nameStyle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 800,
  textAlign: "center",
  whiteSpace: "normal",
  wordBreak: "break-word",
  overflowWrap: "anywhere",
  lineHeight: 1.3
};

const badgeStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  padding: "3px 8px",
  borderRadius: 999,
  background: "linear-gradient(135deg,#ffe08a,#ffb300)",
  color: "#4a2e00",
  boxShadow: "0 0 10px rgba(255,179,0,.55)"
};
