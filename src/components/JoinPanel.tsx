"use client";

import { useState } from "react";

interface Props {
  onJoin: (name: string) => Promise<void>;
  busy?: boolean;
}

export default function JoinPanel({ onJoin, busy }: Props) {
  const [name, setName] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        await onJoin(name.trim());
      }}
      style={formStyle}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسمك..."
        maxLength={40}
        style={inputStyle}
      />
      <button type="submit" disabled={busy || !name.trim()} style={btnStyle}>
        {busy ? "..." : "انضم"}
      </button>
    </form>
  );
}

const formStyle: React.CSSProperties = { display: "flex", gap: 10, width: "100%", maxWidth: 380 };
const inputStyle: React.CSSProperties = {
  flex: 1,
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
