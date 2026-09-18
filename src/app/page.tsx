"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import gsap from "gsap";

const GAMES = [
  { slug: "roulette", title: "عجلة الشخصنة", desc: "دوّر العجلة، اطرد وانعش، لين ما يضل بطل واحد", live: true },
  { slug: "letter-cell", title: "خلية الحروف", desc: "لاقوا كلمة فيها حرف الخلية", live: true },
  { slug: "fastest-word", title: "أسرع كلمة", desc: "أول واحد يكتب الكلمة الصحيحة يفوز", live: true },
  { slug: "flags-guess", title: "تخمين الأعلام", desc: "خمّن اسم الدولة من علمها", live: true },
  { slug: "capitals-guess", title: "تخمين العواصم", desc: "خمّن عاصمة الدولة", live: true },
  { slug: "emoji-guess", title: "تخمين الإيموجي", desc: "خمّن العمل الفني من الإيموجي", live: true },
  { slug: "quiz", title: "الكويز", desc: "جاوب على الأسئلة أسرع من الكل", live: true },
  { slug: "memory", title: "لعبة الذاكرة", desc: "لاقي الأزواج قبل ما يخلص الوقت", live: true },
  { slug: "musical-chairs", title: "الكراسي الموسيقية", desc: "دورو حول الكراسي، وحاجزوا رقم كرسيكم قبل ما يفوتكم", live: true },
  { slug: "fruit-war", title: "صراع الفواكه", desc: "كل واحد فاكهة سرية، وكل جولة تصويت تطيح فاكهة وصاحبها", live: true },
  { slug: "sword-clash", title: "تصادم السيوف", desc: "اضربوا بسرعة عشان تجمعوا قوة — الأضعف يطلع من الحلبة", live: true },
  { slug: "drawing-challenge", title: "تحدي الرسم", desc: "واحد يرسم والباقي يخمنون الكلمة، والدور يتناوب", live: true }
];

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".hero-title",
        { opacity: 0, y: -40, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.9, ease: "back.out(1.7)" }
      );
      gsap.fromTo(
        ".hero-sub",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.25, ease: "power3.out" }
      );
      gsap.fromTo(
        ".game-card",
        { opacity: 0, y: 60, rotateX: -15 },
        {
          opacity: 1,
          y: 0,
          rotateX: 0,
          duration: 0.7,
          stagger: 0.12,
          delay: 0.35,
          ease: "power4.out"
        }
      );
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div className="container" ref={rootRef}>
      <header style={{ textAlign: "center", marginBottom: 56 }}>
        <h1 className="hero-title" style={heroTitleStyle}>
          🎯 دوّار
        </h1>
        <p className="hero-sub" style={{ color: "var(--text-dim)", fontSize: 18 }}>
          منصة ألعاب تفاعلية للبث المباشر — Next.js · TypeScript · SQL
        </p>
      </header>

      <div style={gridStyle}>
        {GAMES.map((g) => (
          <GameCard key={g.slug} {...g} />
        ))}
      </div>
    </div>
  );
}

function GameCard({
  slug,
  title,
  desc,
  live
}: {
  slug: string;
  title: string;
  desc: string;
  live: boolean;
}) {
  const cardRef = useRef<HTMLAnchorElement>(null);

  function handleEnter() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { scale: 1.04, y: -6, duration: 0.3, ease: "power2.out" });
  }
  function handleLeave() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { scale: 1, y: 0, duration: 0.35, ease: "power2.out" });
  }

  const content = (
    <a
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="game-card"
      style={{
        ...cardStyle,
        opacity: live ? 1 : 0.55,
        pointerEvents: live ? "auto" : "none"
      }}
    >
      <h3 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 800 }}>{title}</h3>
      <p style={{ margin: 0, color: "var(--text-dim)", fontSize: 14, lineHeight: 1.6 }}>{desc}</p>
      <span
        style={{
          display: "inline-block",
          marginTop: 16,
          fontSize: 12,
          fontWeight: 800,
          padding: "4px 10px",
          borderRadius: 999,
          background: live ? "rgba(62,207,110,.15)" : "rgba(154,160,180,.15)",
          color: live ? "var(--accent-2)" : "var(--text-dim)"
        }}
      >
        {live ? "● شغّال الحين" : "قريباً"}
      </span>
    </a>
  );

  return live ? <Link href={`/${slug}` as never}>{content}</Link> : content;
}

const heroTitleStyle: React.CSSProperties = {
  fontSize: 56,
  fontWeight: 900,
  margin: "0 0 8px",
  background: "linear-gradient(135deg, var(--accent), #ffd873)",
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent"
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
  gap: 20,
  perspective: 1000
};

const cardStyle: React.CSSProperties = {
  display: "block",
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  padding: "24px 22px",
  boxShadow: "0 20px 50px -20px rgba(0,0,0,.6)"
};
