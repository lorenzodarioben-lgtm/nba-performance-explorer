import { useEffect, useRef } from 'react';
import { useMotionAllowed } from '../../motion/MotionPreference';
import { LiquidModel, type Point } from './liquidModel';

const SIZE = 152;
const CENTER = SIZE / 2;

function paint(ctx: CanvasRenderingContext2D, model: LiquidModel, dpr: number) {
  ctx.setTransform(dpr, 0, 0, dpr, CENTER * dpr, CENTER * dpr);
  ctx.clearRect(-CENTER, -CENTER, SIZE, SIZE);
  const points = model.boundary();
  const path = new Path2D();
  const first = points[0]!,
    last = points[points.length - 1]!;
  path.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2);
  points.forEach((p, i) => {
    const next = points[(i + 1) % points.length]!;
    path.quadraticCurveTo(p.x, p.y, (p.x + next.x) / 2, (p.y + next.y) / 2);
  });
  path.closePath();
  ctx.save();
  ctx.shadowColor = 'rgba(228, 39, 37, 0.28)';
  ctx.shadowBlur = 17;
  ctx.shadowOffsetY = 5;
  const body = ctx.createRadialGradient(-17, -23, 2, 5, 8, 65);
  body.addColorStop(0, '#ff6752');
  body.addColorStop(0.38, '#e0322c');
  body.addColorStop(0.73, '#b4141e');
  body.addColorStop(1, '#740b15');
  ctx.fillStyle = body;
  ctx.fill(path);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.clip(path);
  ctx.strokeStyle = 'rgba(255, 157, 128, 0.32)';
  ctx.lineWidth = 2;
  ctx.stroke(path);
  const light = ctx.createRadialGradient(-18, -25, 0, -18, -25, 28);
  light.addColorStop(0, 'rgba(255, 214, 185, 0.28)');
  light.addColorStop(1, 'rgba(255, 214, 185, 0)');
  ctx.fillStyle = light;
  ctx.fillRect(-70, -70, 140, 140);
  ctx.restore();
}

/** Decorative liquid surface. No React renders in the animation loop; no idle rendering. */
export function LiquidVersus() {
  const hostRef = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const allowed = useMotionAllowed();

  useEffect(() => {
    const host = hostRef.current,
      canvas = canvasRef.current;
    if (!host || !canvas || !allowed || !window.matchMedia('(pointer: fine)').matches)
      return;
    let ctx: CanvasRenderingContext2D | null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;
    const context = ctx;
    const model = new LiquidModel();
    let dpr = 1,
      frame = 0,
      lastTime = 0,
      visible = false;
    let bounds = host.getBoundingClientRect();
    let previous: (Point & { time: number }) | null = null;

    function render() {
      try {
        paint(context, model, dpr);
        host!.dataset.liquid = 'ready';
      } catch {
        delete host!.dataset.liquid;
        visible = false;
      }
    }
    function stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      previous = null;
      model.reset();
      render();
      host!.dataset.active = 'false';
    }
    function tick(time: number) {
      frame = 0;
      if (!visible || document.hidden) return;
      const elapsed = Math.min(0.05, (time - (lastTime || time - 16.67)) / 1000);
      lastTime = time;
      const steps = Math.max(1, Math.ceil(elapsed * 120));
      for (let i = 0; i < steps; i++) model.step(elapsed / steps);
      render();
      if (visible && model.energy() > 0.002) frame = requestAnimationFrame(tick);
      else stop();
    }
    function measure() {
      bounds = host!.getBoundingClientRect();
      previous = null;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (nextDpr !== dpr || !canvas!.width) {
        dpr = nextDpr;
        canvas!.width = Math.round(SIZE * dpr);
        canvas!.height = Math.round(SIZE * dpr);
        render();
      }
    }
    function pointer(event: PointerEvent) {
      if (!visible || document.hidden || event.pointerType === 'touch') return;
      const point = {
        x: event.clientX - bounds.left - bounds.width / 2,
        y: event.clientY - bounds.top - bounds.height / 2,
        time: event.timeStamp,
      };
      if (previous) {
        const near =
          Math.min(Math.hypot(point.x, point.y), Math.hypot(previous.x, previous.y)) <
          110;
        if (near) model.disturb(previous, point, (point.time - previous.time) / 1000);
        if (!frame && model.energy() > 0.002) {
          lastTime = 0;
          host!.dataset.active = 'true';
          frame = requestAnimationFrame(tick);
        }
      }
      previous = point;
    }
    function visibility() {
      if (document.hidden) stop();
      else measure();
    }
    canvas.width = 0;
    measure();
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry?.isIntersecting ?? false;
        if (visible) measure();
        else stop();
      },
      { threshold: 0.1 },
    );
    observer.observe(host);
    const resize = new ResizeObserver(measure);
    resize.observe(host);
    window.addEventListener('pointermove', pointer, { passive: true });
    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      window.removeEventListener('pointermove', pointer);
      window.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      document.removeEventListener('visibilitychange', visibility);
      delete host.dataset.liquid;
      delete host.dataset.active;
    };
  }, [allowed]);

  return (
    <span ref={hostRef} className="homecmp__vs" aria-hidden="true">
      <canvas ref={canvasRef} className="homecmp__liquid" width={0} height={0} />
      <span className="homecmp__vs-label">VS</span>
    </span>
  );
}
