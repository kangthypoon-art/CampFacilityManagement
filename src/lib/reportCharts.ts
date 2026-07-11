// Canvas-based chart image generation for the Word report.
// Must be called only in browser context (HTMLCanvasElement).

const ACCENT = '#0d9488';
const BLUE   = '#3b82f6';
const MUTED  = '#6b7280';
const BORDER = '#e2e8f0';
const WHITE  = '#ffffff';

export const CAT_COLORS = ['#4472C4', '#ED7D31', '#A9D18E', '#FF6B6B'];
export const CAT_LABELS = ['침대커버', '배개', '이불', '발판'] as const;

function canvasToUint8(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) { reject(new Error('canvas.toBlob failed')); return; }
      blob.arrayBuffer().then(ab => resolve(new Uint8Array(ab)));
    }, 'image/png');
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// ─── 통계 카드 (400×130) ─────────────────────────────────────────────────────

export async function drawStatCard(
  label: string,
  value: string,
  color: string,
  floors: { floor: string; count: number; unit: string }[],
): Promise<Uint8Array> {
  const W = 400, H = 130;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = '#f9fafb';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, 4);

  ctx.fillStyle = MUTED;
  ctx.font = '600 11px "Arial", sans-serif';
  ctx.fillText(label.toUpperCase(), 14, 26);

  ctx.fillStyle = color;
  ctx.font = 'bold 26px "Arial", sans-serif';
  ctx.fillText(value, 14, 62);

  let bx = 14;
  for (const { floor, count, unit } of floors) {
    ctx.font = 'bold 11px "Arial", sans-serif';
    const text = `${floor} ${count}${unit}`;
    const tw = ctx.measureText(text).width;
    const bw = tw + 16, bh = 24;
    ctx.fillStyle = color + '28';
    roundRect(ctx, bx, 82, bw, bh, 5);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillText(text, bx + 8, 82 + 16);
    bx += bw + 7;
  }

  return canvasToUint8(cv);
}

// ─── 도넛 차트 — 객실 가동율 (400×290) ──────────────────────────────────────

export async function drawRingChart(
  rate: string,
  occupied: number,
  total: number,
  floors: { floor: string; occupied: number; total: number; rate: string }[],
  color: string,
): Promise<Uint8Array> {
  const W = 400, H = 290;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  const cx = 95, cy = 110, R = 68, lw = 20;
  const frac = total > 0 ? occupied / total : 0;

  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI);
  ctx.strokeStyle = BORDER; ctx.lineWidth = lw; ctx.stroke();

  if (frac > 0) {
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + frac * 2 * Math.PI);
    ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = color; ctx.font = 'bold 22px "Arial"';
  ctx.fillText(rate, cx, cy - 4);
  ctx.fillStyle = MUTED; ctx.font = '11px "Arial"';
  ctx.fillText('가동율', cx, cy + 16);
  ctx.textAlign = 'left';

  const lx = 185;
  ctx.fillStyle = '#374151'; ctx.font = '11px "Arial"';
  ctx.fillText(`전체: ${occupied}/${total}개`, lx, 48);

  const flColors = [color, BLUE];
  floors.forEach(({ floor, occupied: o, total: t, rate: r }, i) => {
    const y = 72 + i * 58;
    const fc = flColors[i] ?? color;
    const pct = t > 0 ? o / t : 0;

    ctx.fillStyle = '#374151'; ctx.font = 'bold 11px "Arial"';
    ctx.fillText(`${floor}: ${r} (${o}/${t}개)`, lx, y);

    const bw = 195, bh = 8;
    ctx.fillStyle = BORDER; roundRect(ctx, lx, y + 6, bw, bh, 4); ctx.fill();
    if (pct > 0) { ctx.fillStyle = fc; roundRect(ctx, lx, y + 6, bw * pct, bh, 4); ctx.fill(); }
  });

  ctx.fillStyle = MUTED; ctx.font = '11px "Arial"';
  ctx.fillText(`공실: ${total - occupied}개`, lx, 72 + floors.length * 58 + 8);

  return canvasToUint8(cv);
}

// ─── 수평 막대 차트 — 입실율 (400×270) ──────────────────────────────────────

export async function drawHBarChart(
  rate: string,
  occupied: number,
  total: number,
  floors: { floor: string; occupied: number; total: number; rate: string }[],
  color: string,
): Promise<Uint8Array> {
  const W = 400, H = 270;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  const lx = 14, barW = 365, barH = 12;
  const totalPct = total > 0 ? occupied / total : 0;

  ctx.fillStyle = '#374151'; ctx.font = 'bold 13px "Arial"'; ctx.fillText('전체', lx, 26);
  ctx.fillStyle = color; ctx.font = 'bold 13px "Arial"';
  ctx.textAlign = 'right'; ctx.fillText(rate, W - 14, 26); ctx.textAlign = 'left';

  ctx.fillStyle = BORDER; roundRect(ctx, lx, 33, barW, barH, 6); ctx.fill();
  if (totalPct > 0) { ctx.fillStyle = color; roundRect(ctx, lx, 33, barW * totalPct, barH, 6); ctx.fill(); }
  ctx.fillStyle = MUTED; ctx.font = '11px "Arial"';
  ctx.fillText(`${occupied}명 / ${total}명`, lx, 58);

  const flColors = [ACCENT, BLUE];
  floors.forEach(({ floor, occupied: o, total: t, rate: r }, i) => {
    const y = 84 + i * 66;
    const fc = flColors[i] ?? ACCENT;
    const pct = t > 0 ? o / t : 0;

    ctx.fillStyle = '#374151'; ctx.font = 'bold 13px "Arial"'; ctx.fillText(floor, lx, y);
    ctx.fillStyle = fc; ctx.textAlign = 'right'; ctx.fillText(r, W - 14, y); ctx.textAlign = 'left';

    ctx.fillStyle = BORDER; roundRect(ctx, lx, y + 8, barW, barH, 6); ctx.fill();
    if (pct > 0) { ctx.fillStyle = fc; roundRect(ctx, lx, y + 8, barW * pct, barH, 6); ctx.fill(); }
    ctx.fillStyle = MUTED; ctx.font = '11px "Arial"';
    ctx.fillText(`${o}명 / ${t}명`, lx, y + 30);
  });

  return canvasToUint8(cv);
}

// ─── 수직 막대 차트 — 항목별 건수/금액 (400×300) ──────────────────────────

export async function drawVBarChart(
  title: string,
  subtitle: string,
  bars: { label: string; value: number; color: string }[],
  totalValue: number,
  unit: string,
): Promise<Uint8Array> {
  const W = 400, H = 300;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = WHITE;
  ctx.fillRect(0, 0, W, H);

  const fmt = (n: number) => n.toLocaleString('ko-KR');

  ctx.fillStyle = '#111827'; ctx.font = 'bold 13px "Arial"'; ctx.fillText(title, 14, 22);
  ctx.fillStyle = MUTED; ctx.font = '11px "Arial"'; ctx.fillText(subtitle, 14, 40);
  ctx.fillStyle = ACCENT; ctx.font = 'bold 19px "Arial"';
  ctx.textAlign = 'right'; ctx.fillText(`${fmt(totalValue)}${unit}`, W - 14, 34); ctx.textAlign = 'left';

  if (bars.length === 0) return canvasToUint8(cv);

  const maxVal = Math.max(...bars.map(b => b.value), 1);
  const chartH = 168, chartTop = 54, chartBottom = chartTop + chartH;
  const barW = 60;
  const gap = (W - bars.length * barW) / (bars.length + 1);

  bars.forEach((b, i) => {
    const bh = Math.max((b.value / maxVal) * chartH, 2);
    const x = gap + i * (barW + gap);
    const y = chartBottom - bh;

    ctx.fillStyle = b.color; roundRect(ctx, x, y, barW, bh, 4); ctx.fill();

    // Value label
    const valStr = unit === '원' && b.value >= 10000
      ? `${Math.round(b.value / 10000)}만`
      : fmt(b.value);
    ctx.fillStyle = b.color; ctx.font = 'bold 10px "Arial"';
    ctx.textAlign = 'center'; ctx.fillText(valStr, x + barW / 2, y - 5);

    // Category label
    ctx.fillStyle = MUTED; ctx.font = '11px "Arial"';
    ctx.fillText(b.label, x + barW / 2, chartBottom + 15);
    ctx.textAlign = 'left';
  });

  // Legend
  const ly = H - 28;
  bars.forEach((b, i) => {
    const lx = 14 + i * 96;
    ctx.fillStyle = b.color; ctx.fillRect(lx, ly, 10, 10);
    ctx.fillStyle = MUTED; ctx.font = '10px "Arial"';
    ctx.fillText(`${b.label} ${fmt(b.value)}${unit}`, lx + 14, ly + 10);
  });

  return canvasToUint8(cv);
}
