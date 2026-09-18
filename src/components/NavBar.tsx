"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

interface MePayload {
  user: { login: string; displayName: string; avatarUrl: string | null; coins: number; isAdmin: boolean } | null;
}

const LINKS = [
  { href: "/", label: "الرئيسية" },
  { href: "/roulette", label: "عجلة الشخصنة" },
  { href: "/tasks", label: "المهام" },
  { href: "/badges", label: "الشارات" },
  { href: "/store", label: "المتجر" },
  { href: "/leaderboard", label: "المتصدرين" },
  { href: "/settings", label: "الإعدادات" }
];

export default function NavBar() {
  const { status } = useSession();
  const [me, setMe] = useState<MePayload["user"]>(null);

  useEffect(() => {
    if (status !== "authenticated") {
      setMe(null);
      return;
    }
    fetch("/api/me")
      .then((r) => r.json())
      .then((data: MePayload) => setMe(data.user))
      .catch(() => setMe(null));
  }, [status]);

  return (
    <nav style={navStyle}>
      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href as never} style={linkStyle}>
            {l.label}
          </Link>
        ))}
        {me?.isAdmin && (
          <Link href={"/admin" as never} style={{ ...linkStyle, color: "var(--danger)" }}>
            لوحة الأدمن
          </Link>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {status === "authenticated" && me ? (
          <>
            <span style={coinPillStyle}>🪙 {me.coins.toLocaleString("en-US")}</span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{me.displayName}</span>
            {me.avatarUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.avatarUrl} alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
            )}
            <button onClick={() => signOut()} style={twitchBtnStyle}>
              خروج
            </button>
          </>
        ) : (
          <button onClick={() => signIn("twitch")} style={twitchBtnStyle}>
            تسجيل الدخول بتويتش
          </button>
        )}
      </div>
    </nav>
  );
}

const navStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  padding: "14px 20px",
  borderBottom: "1px solid var(--border)",
  background: "rgba(11,13,20,.85)",
  backdropFilter: "blur(10px)",
  position: "sticky",
  top: 0,
  zIndex: 40,
  flexWrap: "wrap"
};

const linkStyle: React.CSSProperties = {
  padding: "8px 14px",
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 700,
  color: "var(--text-dim)"
};

const coinPillStyle: React.CSSProperties = {
  background: "var(--surface-2)",
  border: "1px solid var(--border-strong)",
  borderRadius: 999,
  padding: "6px 14px",
  fontSize: 13,
  fontWeight: 800,
  color: "var(--accent-2)"
};

const twitchBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg,#9146ff,#772ce8)",
  color: "#fff",
  fontWeight: 800,
  fontSize: 13.5
};
