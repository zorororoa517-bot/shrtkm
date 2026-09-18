"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { ClientPlayer } from "@/types/room";

export default function WinnerOverlay({ winner, onRestart }: { winner: ClientPlayer; onRestart: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const confettiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".winner-card",
        { scale: 0.4, opacity: 0, rotate: -8 },
        { scale: 1, opacity: 1, rotate: 0, duration: 0.7, ease: "elastic.out(1, 0.55)" }
      );
      gsap.fromTo(
        ".winner-avatar",
        { scale: 0, rotate: 0 },
        { scale: 1, rotate: 360, duration: 0.9, delay: 0.15, ease: "back.out(2)" }
      );

      // Confetti burst: N small squares flung outward with gravity + fade.
      const container = confettiRef.current;
      if (container) {
        const colors = ["#e8a00f", "#3ecf6e", "#5b9df0", "#f2495b", "#b985f4", "#f0a75b"];
        for (let i = 0; i < 60; i++) {
          const piece = document.createElement("div");
          piece.style.position = "absolute";
          piece.style.left = "50%";
          piece.style.top = "40%";
          piece.style.width = "8px";
          piece.style.height = "8px";
          piece.style.background = colors[i % colors.length]!;
          piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
          container.appendChild(piece);

          const angle = Math.random() * Math.PI * 2;
          const distance = 200 + Math.random() * 260;
          gsap.to(piece, {
            x: Math.cos(angle) * distance,
            y: Math.sin(angle) * distance + 180,
            rotation: Math.random() * 720 - 360,
            opacity: 0,
            duration: 1.6 + Math.random() * 0.8,
            ease: "power2.out",
            onComplete: () => piece.remove()
          });
        }
      }
    }, rootRef);
    return () => ctx.revert();
  }, []);

  return (
    <div ref={rootRef} style={overlayStyle}>
      <div ref={confettiRef} style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }} />
      <div className="winner-card" style={cardStyle}>
        <div
          className="winner-avatar"
          style={{ ...avatarStyle, background: winner.color, color: "#1a1a1a" }}
        >
          {winner.letter}
        </div>
        <h2 style={{ margin: "18px 0 4px", fontSize: 28, fontWeight: 900 }}>🏆 {winner.name} فاز!</h2>
        <p style={{ color: "var(--text-dim)", margin: "0 0 20px" }}>
          يحمل طردة ⚡x2 دبل بالجولة الجاية
        </p>
        <button onClick={onRestart} style={restartBtnStyle}>
          🔁 جولة جديدة
        </button>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(5,6,10,.82)",
  backdropFilter: "blur(6px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 50
};

const cardStyle: React.CSSProperties = {
  position: "relative",
  zIndex: 2,
  background: "var(--surface)",
  border: "1px solid var(--border-strong)",
  borderRadius: 24,
  padding: "40px 50px",
  textAlign: "center",
  boxShadow: "0 40px 100px -20px rgba(0,0,0,.8)"
};

const avatarStyle: React.CSSProperties = {
  width: 96,
  height: 96,
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 40,
  fontWeight: 900,
  margin: "0 auto"
};

const restartBtnStyle: React.CSSProperties = {
  padding: "12px 24px",
  borderRadius: 12,
  border: "none",
  background: "var(--accent)",
  color: "#1a1a1a",
  fontWeight: 800,
  fontSize: 15
};
