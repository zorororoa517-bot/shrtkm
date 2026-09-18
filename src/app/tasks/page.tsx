"use client";

import { useEffect, useState } from "react";

interface TaskRow {
  id: string;
  title: string;
  icon: string;
  target: number;
  reward: number;
  period: "daily" | "all";
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [coins, setCoins] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (data.error) return setError(data.error);
    setTasks(data.tasks);
    setCoins(data.coins);
  }

  useEffect(() => {
    load();
  }, []);

  async function claim(id: string) {
    setBusyId(id);
    const res = await fetch("/api/tasks/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId: id })
    });
    const data = await res.json();
    setBusyId(null);
    if (!data.error) load();
  }

  if (error) {
    return (
      <div className="container" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 12 }}>📋 المهام</h1>
        <p style={{ color: "var(--text-dim)" }}>{error}</p>
      </div>
    );
  }
  if (!tasks) return <div className="container" style={{ textAlign: "center" }}>تحميل...</div>;

  const daily = tasks.filter((t) => t.period === "daily");
  const allTime = tasks.filter((t) => t.period === "all");

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900 }}>📋 المهام</h1>
        <span style={coinChip}>🪙 {coins}</span>
      </header>

      <h3 style={{ marginBottom: 10, color: "var(--text-dim)" }}>مهام اليوم (تتجدد كل يوم)</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
        {daily.map((t) => (
          <TaskCard key={t.id} task={t} busy={busyId === t.id} onClaim={() => claim(t.id)} />
        ))}
      </div>

      <h3 style={{ marginBottom: 10, color: "var(--text-dim)" }}>أهداف دائمة</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {allTime.map((t) => (
          <TaskCard key={t.id} task={t} busy={busyId === t.id} onClaim={() => claim(t.id)} />
        ))}
      </div>
    </div>
  );
}

function TaskCard({ task, busy, onClaim }: { task: TaskRow; busy: boolean; onClaim: () => void }) {
  const pct = Math.min(100, Math.round((task.progress / task.target) * 100));
  return (
    <div style={card}>
      <div style={{ fontSize: 26 }}>{task.icon}</div>
      <div style={{ flex: 1, minWidth: 160 }}>
        <p style={{ fontWeight: 700, marginBottom: 6 }}>{task.title}</p>
        <div style={{ height: 8, borderRadius: 999, background: "var(--surface-2)", overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: task.completed ? "var(--accent-2)" : "var(--accent)" }} />
        </div>
        <p style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 4 }}>{task.progress} / {task.target}</p>
      </div>
      <div style={{ textAlign: "center" }}>
        <p style={{ fontWeight: 800, color: "var(--accent)", marginBottom: 6 }}>🪙 {task.reward}</p>
        <button
          onClick={onClaim}
          disabled={!task.completed || task.claimed || busy}
          style={{ ...claimBtn, opacity: task.claimed ? 0.5 : 1 }}
        >
          {task.claimed ? "تم الاستلام ✅" : task.completed ? "استلم" : "قيد التقدّم"}
        </button>
      </div>
    </div>
  );
}

const card: React.CSSProperties = { display: "flex", alignItems: "center", gap: 16, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, flexWrap: "wrap" };
const claimBtn: React.CSSProperties = { padding: "8px 16px", borderRadius: 10, border: "none", background: "var(--accent)", color: "#1a1a1a", fontWeight: 800, fontSize: 13 };
const coinChip: React.CSSProperties = { background: "var(--surface-2)", border: "1px solid var(--border-strong)", borderRadius: 999, padding: "8px 16px", fontWeight: 800, fontSize: 14 };
