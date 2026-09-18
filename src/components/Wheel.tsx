"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import type { ClientPlayer } from "@/types/room";

interface WheelProps {
  players: ClientPlayer[];
  /** Bump `nonce` to trigger a new spin even if targetIndex repeats. */
  spinRequest: { targetIndex: number; nonce: number } | null;
  spinSeconds: number;
  onSpinComplete?: () => void;
}

const CANVAS_SIZE = 640;

export default function Wheel({ players, spinRequest, spinSeconds, onSpinComplete }: WheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0); // cumulative rotation in degrees, always increasing
  const lastNonceRef = useRef<number | null>(null);

  const draw = (rotationDeg: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(r, r);
    ctx.rotate((rotationDeg * Math.PI) / 180);

    const n = Math.max(players.length, 1);
    const anglePerSlice = (Math.PI * 2) / n;

    players.forEach((p, i) => {
      const start = i * anglePerSlice;
      const end = start + anglePerSlice;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.25)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // ---- draw the player's FULL name, never truncated ----
      // Instead of cutting the text short with "…", we shrink the font
      // per-slice until the measured width fits the available radial
      // length. This keeps every name fully readable no matter how many
      // players are on the wheel or how long a name is.
      ctx.save();
      ctx.rotate(start + anglePerSlice / 2);
      ctx.textAlign = "right";
      ctx.textBaseline = "middle";
      ctx.fillStyle = contrastText(p.color);

      const availableLen = r - 20;
      let fontSize = Math.max(9, Math.min(16, Math.round(16 - (n - 8) * 0.28)));
      const minFontSize = 6;
      ctx.font = `bold ${fontSize}px Tajawal, sans-serif`;
      while (fontSize > minFontSize && ctx.measureText(p.name).width > availableLen) {
        fontSize -= 1;
        ctx.font = `bold ${fontSize}px Tajawal, sans-serif`;
      }
      ctx.fillText(p.name, r - 14, 0);
      ctx.restore();
    });

    ctx.restore();
  };

  // Redraw whenever the player list changes (join/eliminate/revive), preserving current rotation.
  useEffect(() => {
    draw(rotationRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // Trigger a spin animation when a new spinRequest arrives.
  useEffect(() => {
    if (!spinRequest || spinRequest.nonce === lastNonceRef.current) return;
    lastNonceRef.current = spinRequest.nonce;

    const n = Math.max(players.length, 1);
    const anglePerSlice = 360 / n;
    const sliceCenter = spinRequest.targetIndex * anglePerSlice + anglePerSlice / 2;
    // "top" (where the pointer sits) is 270° in the clockwise-from-3-o'clock
    // convention used by canvas arcs starting at angle 0.
    const targetMod = ((270 - sliceCenter) % 360 + 360) % 360;

    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const forwardDelta = ((targetMod - currentMod) % 360 + 360) % 360;
    const extraFullSpins = 6 * 360;
    const finalRotation = rotationRef.current + extraFullSpins + forwardDelta;

    gsap.to(rotationRef, {
      current: finalRotation,
      duration: spinSeconds,
      ease: "power4.out",
      onUpdate: () => draw(rotationRef.current),
      onComplete: () => {
        rotationRef.current = finalRotation;
        onSpinComplete?.();
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinRequest]);

  return (
    <div style={wrapStyle}>
      <div style={pointerStyle} />
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        style={{ width: "100%", height: "100%", borderRadius: "50%", boxShadow: "0 0 0 6px #1d2130, 0 0 0 8px #3a4160, 0 20px 60px -15px rgba(0,0,0,.6)" }}
      />
      <div style={hubStyle}>🎯</div>
    </div>
  );
}

function contrastText(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1a1a1a" : "#ffffff";
}

const wrapStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  maxWidth: 680,
  aspectRatio: "1",
  margin: "0 auto",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const pointerStyle: React.CSSProperties = {
  position: "absolute",
  top: -6,
  left: "50%",
  transform: "translateX(-50%)",
  width: 0,
  height: 0,
  borderLeft: "16px solid transparent",
  borderRight: "16px solid transparent",
  borderTop: "28px solid var(--accent)",
  zIndex: 3,
  filter: "drop-shadow(0 4px 6px rgba(0,0,0,.5))"
};

const hubStyle: React.CSSProperties = {
  position: "absolute",
  width: 64,
  height: 64,
  borderRadius: "50%",
  background: "var(--surface)",
  border: "3px solid var(--border-strong)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 26,
  zIndex: 2,
  boxShadow: "0 6px 18px rgba(0,0,0,.5)"
};
