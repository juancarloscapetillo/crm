"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#F6B436", "#FCD98A", "#3FBE7A", "#253574", "#ffffff"];
const DURATION = 3000;

type Particle = { x: number; y: number; vx: number; vy: number; life: number; decay: number; color: string; size: number };

export default function Fireworks({ active, onDone }: { active: boolean; onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onDoneRef.current();
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    function resize() {
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    let particles: Particle[] = [];
    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    function burst(x: number, y: number, count: number) {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + rand(-0.15, 0.15);
        const speed = rand(1.5, 4.2);
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          decay: rand(0.012, 0.02),
          color,
          size: rand(1.6, 3),
        });
      }
    }

    const launches: [number, number, number][] = [
      [0.22, 0.32, 0], [0.78, 0.28, 250], [0.5, 0.22, 500],
      [0.32, 0.4, 900], [0.68, 0.38, 1150], [0.5, 0.3, 1500],
      [0.2, 0.3, 1900], [0.8, 0.32, 2100],
    ];
    const timeouts = launches.map(([lx, ly, delay]) =>
      window.setTimeout(() => burst(window.innerWidth * lx, window.innerHeight * ly, 46), delay)
    );

    let rafId = 0;
    let startTime: number | null = null;
    function step(ts: number) {
      if (startTime === null) startTime = ts;
      const elapsed = ts - startTime;
      ctx!.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.045;
        p.life -= p.decay;
        if (p.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx!.globalAlpha = Math.max(p.life, 0);
        ctx!.fillStyle = p.color;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      if (elapsed < DURATION || particles.length > 0) rafId = requestAnimationFrame(step);
    }
    rafId = requestAnimationFrame(step);

    const doneTimer = window.setTimeout(() => onDoneRef.current(), DURATION);

    return () => {
      window.removeEventListener("resize", resize);
      timeouts.forEach(window.clearTimeout);
      window.clearTimeout(doneTimer);
      cancelAnimationFrame(rafId);
    };
  }, [active]);

  if (!active) return null;

  return <canvas ref={canvasRef} className="fixed inset-0 z-[100] pointer-events-none" aria-hidden="true" />;
}
