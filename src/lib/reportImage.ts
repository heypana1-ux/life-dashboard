/**
 * Render a shareable report card to a PNG entirely with the Canvas API (no external CDN,
 * CSP-safe, no dependencies). The page passes already-localized, pre-formatted strings so
 * this stays purely about layout.
 */

export interface ReportCard {
  title: string;
  period: string;
  score: string;
  scoreDelta: string;
  scoreDeltaPositive: boolean;
  tiles: { label: string; value: string }[];
  highlights: string[];
  footer: string;
}

const W = 1080;
const PAD = 72;

export function renderReportImage(card: ReportCard): string {
  const rows = Math.ceil(card.tiles.length / 2);
  const height = 340 + rows * 150 + Math.min(card.highlights.length, 3) * 74 + 160;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  // background
  const grad = ctx.createLinearGradient(0, 0, W, height);
  grad.addColorStop(0, "#111427");
  grad.addColorStop(1, "#1b1030");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, height);

  const font = (size: number, weight = "400") =>
    `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

  // header
  ctx.fillStyle = "#7c7bff";
  ctx.font = font(26, "700");
  ctx.fillText("LIFE REPORT", PAD, PAD + 14);
  ctx.fillStyle = "#9aa3b0";
  ctx.font = font(24);
  ctx.fillText(card.period, PAD, PAD + 52);

  // big score
  ctx.fillStyle = "#ffffff";
  ctx.font = font(120, "800");
  ctx.fillText(card.score, PAD, 250);
  ctx.font = font(30, "700");
  ctx.fillStyle = card.scoreDeltaPositive ? "#34d399" : "#f87171";
  const scoreW = ctx.measureText(card.score).width;
  ctx.fillText(card.scoreDelta, PAD + scoreW + 24, 250);
  ctx.fillStyle = "#9aa3b0";
  ctx.font = font(24);
  ctx.fillText(card.title, PAD, 292);

  // tiles
  let y = 340;
  const tileW = (W - PAD * 2 - 24) / 2;
  card.tiles.forEach((tile, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (tileW + 24);
    const ty = y + row * 150;
    roundRect(ctx, x, ty, tileW, 126, 20);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.fillStyle = "#8a929e";
    ctx.font = font(20, "600");
    ctx.fillText(tile.label.toUpperCase(), x + 28, ty + 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(44, "700");
    ctx.fillText(tile.value, x + 28, ty + 92);
  });

  y += rows * 150 + 10;

  // highlights
  ctx.font = font(24);
  card.highlights.slice(0, 3).forEach((h, i) => {
    const hy = y + i * 74;
    ctx.fillStyle = "#34d399";
    ctx.beginPath();
    ctx.arc(PAD + 8, hy + 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#eef1f5";
    wrapText(ctx, h, PAD + 32, hy + 24, W - PAD * 2 - 40, 32);
  });

  // footer
  ctx.fillStyle = "#6b7482";
  ctx.font = font(22, "600");
  ctx.fillText(card.footer, PAD, height - 50);

  return canvas.toDataURL("image/png");
}

export function downloadReportImage(card: ReportCard, filename = "life-report.png") {
  const url = renderReportImage(card);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

/* ---------------- Year in review (Wrapped) share card ---------------- */

export interface WrappedCard {
  kicker: string; // e.g. "YEAR IN REVIEW"
  year: string;
  subtitle: string; // e.g. "312 days logged"
  tiles: { label: string; value: string }[];
  footer: string;
}

export function renderWrappedImage(card: WrappedCard): string {
  const rows = Math.ceil(card.tiles.length / 2);
  const height = 300 + rows * 150 + 120;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = W * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(scale, scale);

  const grad = ctx.createLinearGradient(0, 0, W, height);
  grad.addColorStop(0, "#4f46e5");
  grad.addColorStop(1, "#9333ea");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, height);

  const font = (size: number, weight = "400") =>
    `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

  // header
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = font(26, "700");
  ctx.fillText(card.kicker, PAD, PAD + 14);

  // big year
  ctx.fillStyle = "#ffffff";
  ctx.font = font(130, "800");
  ctx.fillText(card.year, PAD, 236);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.font = font(28);
  ctx.fillText(card.subtitle, PAD, 282);

  // tiles
  const y = 340;
  const tileW = (W - PAD * 2 - 24) / 2;
  card.tiles.forEach((tile, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = PAD + col * (tileW + 24);
    const ty = y + row * 150;
    roundRect(ctx, x, ty, tileW, 126, 20);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = font(20, "600");
    ctx.fillText(tile.label.toUpperCase(), x + 28, ty + 44);
    ctx.fillStyle = "#ffffff";
    ctx.font = font(40, "700");
    wrapText(ctx, tile.value, x + 28, ty + 90, tileW - 56, 40);
  });

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = font(22, "600");
  ctx.fillText(card.footer, PAD, height - 46);

  return canvas.toDataURL("image/png");
}

export function downloadWrappedImage(card: WrappedCard, filename = "year-in-review.png") {
  const url = renderWrappedImage(card);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  let cy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy);
      line = word;
      cy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, cy);
}
