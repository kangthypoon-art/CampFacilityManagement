'use client';

import { useRef, useEffect, useCallback } from 'react';
import { useThemeStore } from '@/stores/themeStore';
import type { ChartConfig } from '@/types';

interface ChartProps {
  config: ChartConfig;
  height?: number;
  donutLegendId?: string;
}

function cssVar(name: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function Chart({ config, height = 200, donutLegendId }: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = useThemeStore((s) => s.isDark);
  const legendRendered = useRef(false);

  const drawLine = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (config.type !== 'line') return;
      const { data } = config;
      const W = canvas.offsetWidth || 400;
      const H = canvas.offsetHeight || 200;
      const PAD = { t: 10, r: 20, b: 36, l: 48 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;

      const allVals = data.datasets.flatMap((d) => d.data);
      const maxV = Math.max(...allVals) * 1.15;
      const toX = (i: number) => PAD.l + (i / (data.labels.length - 1)) * cW;
      const toY = (v: number) => PAD.t + cH - (v / maxV) * cH;

      ctx.strokeStyle = cssVar('--border');
      ctx.lineWidth = 1;
      for (let i = 0; i <= 5; i++) {
        const y = PAD.t + (i / 5) * cH;
        ctx.beginPath();
        ctx.moveTo(PAD.l, y);
        ctx.lineTo(PAD.l + cW, y);
        ctx.stroke();
        const val = Math.round(maxV - (i / 5) * maxV);
        ctx.fillStyle = cssVar('--text-muted');
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText((val / 1000000).toFixed(1) + 'M', PAD.l - 8, y + 4);
      }

      ctx.textAlign = 'center';
      data.labels.forEach((label, i) => {
        ctx.fillStyle = cssVar('--text-muted');
        ctx.font = '11px system-ui';
        ctx.fillText(label, toX(i), H - 8);
      });

      data.datasets.forEach((ds) => {
        const pts = ds.data.map((v, i) => ({ x: toX(i), y: toY(v) }));

        const grad = ctx.createLinearGradient(0, PAD.t, 0, PAD.t + cH);
        grad.addColorStop(0, ds.color + '33');
        grad.addColorStop(1, ds.color + '00');

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p, i) => {
          const prev = pts[i];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        });
        ctx.lineTo(pts[pts.length - 1].x, PAD.t + cH);
        ctx.lineTo(pts[0].x, PAD.t + cH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p, i) => {
          const prev = pts[i];
          const cpx = (prev.x + p.x) / 2;
          ctx.bezierCurveTo(cpx, prev.y, cpx, p.y, p.x, p.y);
        });
        ctx.strokeStyle = ds.color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();

        pts.forEach((p) => {
          ctx.beginPath();
          ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = ds.color;
          ctx.fill();
          ctx.strokeStyle = cssVar('--surface');
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      });
    },
    [config]
  );

  const drawBar = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (config.type !== 'bar') return;
      const { data } = config;
      const W = canvas.offsetWidth || 400;
      const H = canvas.offsetHeight || 200;
      const PAD = { t: 10, r: 16, b: 36, l: 48 };
      const cW = W - PAD.l - PAD.r;
      const cH = H - PAD.t - PAD.b;

      const allVals = data.datasets.flatMap((d) => d.data);
      const maxV = Math.max(...allVals) * 1.2;
      const n = data.labels.length;
      const dsCount = data.datasets.length;
      const groupW = cW / n;
      const barW = (groupW * 0.65) / dsCount;

      ctx.strokeStyle = cssVar('--border');
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i++) {
        const y = PAD.t + (i / 4) * cH;
        ctx.beginPath();
        ctx.moveTo(PAD.l, y);
        ctx.lineTo(PAD.l + cW, y);
        ctx.stroke();
        const val = Math.round(maxV - (i / 4) * maxV);
        ctx.fillStyle = cssVar('--text-muted');
        ctx.font = '11px system-ui';
        ctx.textAlign = 'right';
        ctx.fillText((val / 1000).toFixed(0) + 'K', PAD.l - 6, y + 4);
      }

      data.labels.forEach((label, i) => {
        ctx.fillStyle = cssVar('--text-muted');
        ctx.font = '11px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(label, PAD.l + groupW * i + groupW / 2, H - 8);
      });

      data.datasets.forEach((ds, di) => {
        ds.data.forEach((v, i) => {
          const bH = (v / maxV) * cH;
          const x = PAD.l + groupW * i + (groupW - barW * dsCount) / 2 + barW * di;
          const y = PAD.t + cH - bH;
          const r = Math.min(4, barW / 3);
          ctx.fillStyle = ds.color;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.lineTo(x + barW - r, y);
          ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
          ctx.lineTo(x + barW, y + bH);
          ctx.lineTo(x, y + bH);
          ctx.lineTo(x, y + r);
          ctx.quadraticCurveTo(x, y, x + r, y);
          ctx.fill();
        });
      });
    },
    [config]
  );

  const drawDoughnut = useCallback(
    (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
      if (config.type !== 'doughnut') return;
      const { data } = config;
      const W = canvas.offsetWidth || 400;
      const H = canvas.offsetHeight || 200;
      const cx = W / 2;
      const cy = H / 2;
      const outerR = Math.min(cx, cy) * 0.88;
      const innerR = outerR * 0.58;

      const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
      const COLORS = data.datasets[0].colors;
      let startAngle = -Math.PI / 2;

      data.datasets[0].data.forEach((val, i) => {
        const angle = (val / total) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerR, startAngle, startAngle + angle);
        ctx.arc(cx, cy, innerR, startAngle + angle, startAngle, true);
        ctx.closePath();
        ctx.fillStyle = COLORS[i];
        ctx.fill();
        ctx.strokeStyle = cssVar('--surface');
        ctx.lineWidth = 3;
        ctx.stroke();
        startAngle += angle;
      });

      ctx.textAlign = 'center';
      ctx.fillStyle = cssVar('--text-muted');
      ctx.font = '12px system-ui';
      ctx.fillText('총 주문', cx, cy - 8);
      ctx.fillStyle = cssVar('--text');
      ctx.font = 'bold 22px system-ui';
      ctx.fillText(total.toLocaleString(), cx, cy + 14);

      // 범례 DOM 생성 (최초 1회)
      if (donutLegendId && !legendRendered.current) {
        const legendEl = document.getElementById(donutLegendId);
        if (legendEl && legendEl.children.length === 0) {
          legendRendered.current = true;
          data.labels.forEach((label, i) => {
            const pct = Math.round((data.datasets[0].data[i] / total) * 100);
            const item = document.createElement('div');
            item.style.cssText =
              'display:flex;align-items:center;justify-content:space-between;font-size:13px;';
            item.innerHTML = `
              <div style="display:flex;align-items:center;gap:8px;">
                <div style="width:10px;height:10px;border-radius:50%;background:${COLORS[i]};flex-shrink:0"></div>
                <span style="color:var(--text-muted)">${label}</span>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <span style="font-weight:700">${data.datasets[0].data[i].toLocaleString()}</span>
                <span style="color:var(--text-muted);min-width:32px;text-align:right">${pct}%</span>
              </div>`;
            legendEl.appendChild(item);
          });
        }
      }
    },
    [config, donutLegendId]
  );

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.offsetWidth || 400;
    const h = canvas.offsetHeight || height;
    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    if (config.type === 'line') drawLine(canvas, ctx);
    else if (config.type === 'bar') drawBar(canvas, ctx);
    else if (config.type === 'doughnut') drawDoughnut(canvas, ctx);
  }, [config, height, drawLine, drawBar, drawDoughnut]);

  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render, isDark]);

  return <canvas ref={canvasRef} height={height} style={{ width: '100%', display: 'block' }} />;
}
