"use client";

import { useEffect, useRef, useState } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
import gsap from "gsap";

interface MeResponse {
  user: { login: string; displayName: string; avatarUrl: string | null; coins: number; isAdmin: boolean; winsCount: number } | null;
  ownedItemSlugs: string[];
}

export default function SettingsPage() {
  const { status } = useSession();
  const [me, setMe] = useState<MeResponse | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(setMe);
  }, [status]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(".settings-card", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: "power3.out" });
    }, rootRef);
    return () => ctx.revert();
  }, [me]);

  return (
    <div className="container" ref={rootRef} style={{ maxWidth: 640 }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 30 }}>⚙️ الإعدادات</h1>

      <div className="settings-card" style={cardStyle}>
        <h3 style={cardTitle}>حساب تويتش</h3>
        {status === "authenticated" && me?.user ? (
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {me.user.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.user.avatarUrl} alt="" width={56} height={56} style={{ borderRadius: "50%" }} />
            )}
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800 }}>{me.user.displayName}</p>
              <p style={{ margin: "2px 0 0", color: "var(--text-dim)", fontSize: 13 }}>@{me.user.login}</p>
            </div>
            <button onClick={() => signOut()} style={dangerBtn}>
              فك الربط / خروج
            </button>
          </div>
        ) : (
          <div>
            <p style={{ color: "var(--text-dim)", marginBottom: 14 }}>حسابك مو مربوط بتويتش حالياً</p>
            <button onClick={() => signIn("twitch")} style={twitchBtn}>
              ربط حساب تويتش
            </button>
          </div>
        )}
      </div>

      {me?.user && (
        <>
          <div className="settings-card" style={cardStyle}>
            <h3 style={cardTitle}>المحفظة والإحصائيات</h3>
            <div style={{ display: "flex", gap: 24 }}>
              <Stat label="النقاط" value={`🪙 ${me.user.coins}`} />
              <Stat label="عدد الفوزات" value={`🏆 ${me.user.winsCount}`} />
            </div>
          </div>

          <div className="settings-card" style={cardStyle}>
            <h3 style={cardTitle}>مقتنياتي ({me.ownedItemSlugs.length})</h3>
            {me.ownedItemSlugs.length ? (
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>{me.ownedItemSlugs.join("، ")}</p>
            ) : (
              <p style={{ color: "var(--text-dim)", fontSize: 13 }}>ما اشتريت شي من المتجر بعد</p>
            )}
          </div>

          {me.user.isAdmin && (
            <div className="settings-card" style={{ ...cardStyle, borderColor: "var(--accent)" }}>
              <h3 style={cardTitle}>🛡️ صلاحيات الأدمن</h3>
              <p style={{ color: "var(--text-dim)", fontSize: 13, margin: 0 }}>
                حسابك مسجّل كأدمن دائم بالموقع.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{value}</p>
      <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-dim)" }}>{label}</p>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 22,
  marginBottom: 18
};

const cardTitle: React.CSSProperties = { margin: "0 0 16px", fontSize: 16, fontWeight: 800 };

const twitchBtn: React.CSSProperties = {
  padding: "11px 22px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg,#9146ff,#772ce8)",
  color: "#fff",
  fontWeight: 800
};

const dangerBtn: React.CSSProperties = {
  padding: "9px 16px",
  borderRadius: 999,
  border: "1px solid var(--danger)",
  background: "transparent",
  color: "var(--danger)",
  fontWeight: 700,
  fontSize: 13
};
