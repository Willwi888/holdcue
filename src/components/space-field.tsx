import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  z: number;
  s: number;
  vx: number;
  vy: number;
  hue: number;
};

export function SpaceField() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let particles: Particle[] = [];

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(180, (w * h) / 9000));
      particles = Array.from({ length: count }, () => spawn());
    };

    const spawn = (fromEdge = false): Particle => {
      const z = 0.2 + Math.random() * 0.8;
      return {
        x: Math.random() * w,
        y: fromEdge ? h + 8 : Math.random() * h,
        z,
        s: 0.7 + z * 2.4,
        vx: (Math.random() - 0.5) * 0.12 * z,
        vy: -0.12 - z * 0.28,
        hue: Math.random() < 0.12 ? 1 : 0,
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.y < -8 || p.x < -8 || p.x > w + 8) {
            Object.assign(p, spawn(true));
            p.y = h + 6;
            p.x = Math.random() * w;
          }
        }
        const a = 0.35 + p.z * 0.6;
        ctx.beginPath();
        ctx.fillStyle =
          p.hue === 1
            ? `rgba(232, 90, 18, ${Math.min(1, a + 0.1)})`
            : `rgba(236, 244, 255, ${Math.min(1, a)})`;
        ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fill();
        if (p.s > 2) {
          ctx.beginPath();
          ctx.fillStyle =
            p.hue === 1
              ? `rgba(232, 90, 18, 0.18)`
              : `rgba(236, 244, 255, 0.16)`;
          ctx.arc(p.x, p.y, p.s * 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    };

    resize();
    draw();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="pointer-events-none fixed inset-0 z-0 opacity-40"
      aria-hidden
    />
  );
}
