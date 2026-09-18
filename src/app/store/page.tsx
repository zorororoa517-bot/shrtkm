"use client";

import { useEffect, useRef, useState } from "react";
import { useSession, signIn } from "next-auth/react";
import gsap from "gsap";

interface StoreItem {
  slug: string;
  name: string;
  category: "AVATAR_FRAME" | "PROFILE_BANNER";
  price: number;
  previewCss: string;
  owned: boolean;
}

export default function StorePage() {
  const { status } = useSession();
  const [items, setItems] = useState<StoreItem[]>([]);
  const [coins, setCoins] = useState<number | null>(null);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/store/items");
    const data = await res.json();
    setItems(data.items);
    setCoins(data.coins);
  }

  useEffect(() => {
    load();
  }, [status]);

  useEffect(() => {
    if (!items.length) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".store-item",
        { opacity: 0, y: 40, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.5, stagger: 0.06, ease: "back.out(1.6)" }
      );
    }, rootRef);
    return () => ctx.revert();
  }, [items.length]);

  async function buy(item: StoreItem, el: HTMLElement | null) {
    if (status !== "authenticated") {
      signIn("twitch");
      return;
    }
    setBusySlug(item.slug);
    setNotice(null);
    try {
      const res = await fetch("/api/store/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: item.slug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تعذّر الشراء");
      if (el) {
        gsap.fromTo(el, { scale: 1 }, { scale: 1.12, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" });
      }
      setCoins(data.coins);
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "صار خطأ");
    } finally {
      setBusySlug(null);
    }
  }

  const frames = items.filter((i) => i.category === "AVATAR_FRAME");
  const banners = items.filter((i) => i.category === "PROFILE_BANNER");

  return (
    <div className="container" ref={rootRef}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 30 }}>
        <div>
          <h1 style={{ fontSize: 36, fontWeight: 900, margin: 0 }}>🛍️ المتجر</h1>
          <p style={{ color: "var(--text-dim)", margin: "6px 0 0" }}>إطارات وبنرات تفعّلها بملفك الشخصي</p>
        </div>
        {coins !== null && (
          <div style={walletStyle}>
            🪙 <b>{coins.toLocaleString("en-US")}</b> <span>نقطة</span>
          </div>
        )}
      </header>

      {status !== "authenticated" && (
        <div style={gateStyle}>
          <p style={{ margin: "0 0 16px", color: "var(--text-dim)" }}>سجّل دخولك بتويتش عشان تشتري من المتجر</p>
          <button onClick={() => signIn("twitch")} style={twitchBtn}>
            تسجيل الدخول بتويتش
          </button>
        </div>
      )}

      <SectionTitle title="🖼️ إطارات الصورة" />
      <div style={gridStyle}>
        {frames.map((item) => (
          <ItemCard key={item.slug} item={item} busy={busySlug === item.slug} onBuy={buy} />
        ))}
      </div>

      <SectionTitle title="🎨 بنرات الملف" />
      <div style={gridStyle}>
        {banners.map((item) => (
          <ItemCard key={item.slug} item={item} busy={busySlug === item.slug} onBuy={buy} />
        ))}
      </div>

      {notice && <p style={{ color: "var(--danger)", textAlign: "center", marginTop: 20 }}>{notice}</p>}
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return <h2 style={{ fontSize: 19, margin: "40px 0 18px" }}>{title}</h2>;
}

function ItemCard({
  item,
  busy,
  onBuy
}: {
  item: StoreItem;
  busy: boolean;
  onBuy: (item: StoreItem, el: HTMLElement | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isFrame = item.category === "AVATAR_FRAME";

  return (
    <div className="store-item" ref={ref} style={cardStyle}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 90, marginBottom: 14 }}>
        {isFrame ? (
          <div style={{ width: 70, height: 70, borderRadius: "50%", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, ...parseCss(item.previewCss) }}>
            ع
          </div>
        ) : (
          <div style={{ width: "100%", height: 70, borderRadius: 12, background: item.previewCss }} />
        )}
      </div>
      <p style={{ fontWeight: 800, fontSize: 14, margin: "0 0 10px", textAlign: "center" }}>{item.name}</p>
      <p style={{ textAlign: "center", color: "var(--accent-2)", fontWeight: 800, fontSize: 13, margin: "0 0 12px" }}>
        {item.price > 0 ? `🪙 ${item.price}` : "مجاني"}
      </p>
      <button
        disabled={item.owned || busy}
        onClick={() => onBuy(item, ref.current)}
        style={{ ...buyBtnStyle, ...(item.owned ? ownedBtnStyle : {}) }}
      >
        {item.owned ? "مملوك" : busy ? "..." : "شراء"}
      </button>
    </div>
  );
}

/** Turns a CSS declaration string like "border:4px solid #f4c93a;" into a React style object. */
function parseCss(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  css.split(";").forEach((rule) => {
    const [prop, value] = rule.split(":");
    if (!prop || !value) return;
    const camel = prop.trim().replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[camel] = value.trim();
  });
  return out as React.CSSProperties;
}

const walletStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 999,
  padding: "10px 20px",
  fontSize: 15
};

const gateStyle: React.CSSProperties = {
  textAlign: "center",
  padding: "40px 20px",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 20,
  marginBottom: 30
};

const twitchBtn: React.CSSProperties = {
  padding: "12px 26px",
  borderRadius: 999,
  border: "none",
  background: "linear-gradient(135deg,#9146ff,#772ce8)",
  color: "#fff",
  fontWeight: 800
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
  gap: 16
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 18,
  padding: 18
};

const buyBtnStyle: React.CSSProperties = {
  width: "100%",
  padding: 10,
  borderRadius: 12,
  border: "1px solid var(--border-strong)",
  background: "var(--surface-2)",
  color: "var(--text)",
  fontWeight: 700,
  fontSize: 13.5
};

const ownedBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "var(--text-dim)"
};
