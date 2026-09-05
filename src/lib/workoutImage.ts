/**
 * A shareable card for one workout, drawn with the Canvas API only — no dependencies, no CDN,
 * nothing for a CSP to block. The page hands over already-localized, already-formatted strings
 * so this file stays purely about layout and paint.
 *
 * Two shapes come out of the same renderer:
 *  - a strength session: exercises grouped by muscle, each with its sets
 *  - anything else (a run, a ride, a class): duration, distance and how it felt, since there
 *    are no sets to show and a table of empty rows would be worse than none
 */

export interface ImageSet {
  /** "80 + 10 kg × 8", "60 s", "Body 78 kg × 12" — formatted by the caller. */
  text: string;
  /** Marks the heaviest / longest set of that exercise. */
  best?: boolean;
}

export interface ImageExercise {
  name: string;
  sets: ImageSet[];
}

export interface ImageMuscleGroup {
  /** Localized muscle-group label. */
  label: string;
  exercises: ImageExercise[];
}

export interface WorkoutCard {
  /** "Strength Training", "Running" … */
  sport: string;
  /** "Thursday, 4 September" */
  date: string;
  /** Big headline stats, 2–4 of them. */
  stats: { label: string; value: string }[];
  /** 1..10 ratings shown as small meters. Empty for a workout that has none. */
  ratings: { label: string; value: number }[];
  /** Muscle groups with their exercises — empty for non-strength workouts. */
  groups: ImageMuscleGroup[];
  /** Optional one-line note under the title. */
  note?: string;
  footer: string;
}

const W = 1080;
const PAD = 72;
const SCALE = 2;

const FONT = (size: number, weight = "400") =>
  `${weight} ${size}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;

/** The app's blue, used for the watermark and every accent in the card. */
const BLUE = "#6366f1";
const BLUE_LIGHT = "#818cf8";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** How tall the card needs to be, so nothing is clipped and nothing floats in empty space.
 *  Every number here mirrors an advance in the paint below — keep the two in step. */
function measure(card: WorkoutCard): number {
  let h = PAD + 20 + 62 + 34 + 54; // top margin, date kicker, title, breathing room
  if (card.note) h += 46;
  h += 168; // stat row
  if (card.ratings.length) h += 38 + card.ratings.length * 52;
  for (const g of card.groups) {
    h += 62; // group heading
    for (const ex of g.exercises) h += 46 + Math.ceil(ex.sets.length / 3) * 44;
    h += 10;
  }
  return h + 130; // footer + watermark
}

export function renderWorkoutImage(card: WorkoutCard): string {
  const height = measure(card);
  const canvas = document.createElement("canvas");
  canvas.width = W * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(SCALE, SCALE);

  // ---- Background: a deep indigo wash with a soft bloom behind the header ----
  const bg = ctx.createLinearGradient(0, 0, W * 0.6, height);
  bg.addColorStop(0, "#0f1020");
  bg.addColorStop(0.55, "#14152b");
  bg.addColorStop(1, "#1a1030");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, height);

  const bloom = ctx.createRadialGradient(W * 0.82, 40, 0, W * 0.82, 40, 520);
  bloom.addColorStop(0, "rgba(99,102,241,0.42)");
  bloom.addColorStop(1, "rgba(99,102,241,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(0, 0, W, 560);

  let y = PAD + 20;

  // ---- Header ----
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = FONT(24, "600");
  ctx.letterSpacing = "3px";
  ctx.fillText(card.date.toUpperCase(), PAD, y);
  ctx.letterSpacing = "0px";
  y += 62;

  const title = ctx.createLinearGradient(PAD, y - 40, PAD + 620, y + 10);
  title.addColorStop(0, "#ffffff");
  title.addColorStop(1, BLUE_LIGHT);
  ctx.fillStyle = title;
  ctx.font = FONT(62, "700");
  ctx.fillText(fit(ctx, card.sport, W - PAD * 2), PAD, y);
  y += 34;

  if (card.note) {
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.font = FONT(26);
    ctx.fillText(fit(ctx, card.note, W - PAD * 2), PAD, y + 26);
    y += 46;
  }
  y += 54;

  // ---- Stat row ----
  const cols = Math.min(card.stats.length, 4) || 1;
  const gap = 20;
  const cw = (W - PAD * 2 - gap * (cols - 1)) / cols;
  card.stats.slice(0, 4).forEach((s, i) => {
    const x = PAD + i * (cw + gap);
    const g = ctx.createLinearGradient(x, y, x + cw, y + 128);
    g.addColorStop(0, "rgba(99,102,241,0.28)");
    g.addColorStop(1, "rgba(99,102,241,0.07)");
    ctx.fillStyle = g;
    roundRect(ctx, x, y, cw, 128, 24);
    ctx.fill();
    ctx.strokeStyle = "rgba(129,140,248,0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.font = FONT(20, "600");
    ctx.letterSpacing = "1.5px";
    ctx.fillText(fit(ctx, s.label.toUpperCase(), cw - 36), x + 22, y + 42);
    ctx.letterSpacing = "0px";
    ctx.fillStyle = "#ffffff";
    // A pace or a bpm reading is longer than a rep count. Shrink the number to fit rather
    // than cutting it off — "5:36 /…" would be worse than a slightly smaller "5:36 /km".
    ctx.font = FONT(fitSize(ctx, s.value, cw - 36, 42, 26, "700"), "700");
    ctx.fillText(fit(ctx, s.value, cw - 36), x + 22, y + 96);
  });
  y += 128 + 40;

  // ---- Ratings as slim meters ----
  if (card.ratings.length) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = FONT(21, "700");
    ctx.letterSpacing = "2.5px";
    ctx.fillText("SESSION", PAD, y);
    ctx.letterSpacing = "0px";
    y += 30;
    for (const r of card.ratings) {
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = FONT(26, "500");
      ctx.fillText(r.label, PAD, y + 22);
      ctx.fillStyle = "#ffffff";
      ctx.font = FONT(26, "700");
      const v = `${r.value}/10`;
      ctx.fillText(v, W - PAD - ctx.measureText(v).width, y + 22);

      const barY = y + 36;
      const barW = W - PAD * 2;
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      roundRect(ctx, PAD, barY, barW, 8, 4);
      ctx.fill();
      const fillW = Math.max(8, (barW * Math.max(0, Math.min(10, r.value))) / 10);
      const mg = ctx.createLinearGradient(PAD, 0, PAD + fillW, 0);
      mg.addColorStop(0, BLUE);
      mg.addColorStop(1, "#a78bfa");
      ctx.fillStyle = mg;
      roundRect(ctx, PAD, barY, fillW, 8, 4);
      ctx.fill();
      y += 52;
    }
    y += 8;
  }

  // ---- Muscle groups ----
  for (const g of card.groups) {
    ctx.fillStyle = BLUE_LIGHT;
    ctx.font = FONT(21, "700");
    ctx.letterSpacing = "2.5px";
    ctx.fillText(g.label.toUpperCase(), PAD, y + 22);
    ctx.letterSpacing = "0px";
    // A hairline that stops short of the label
    const lw = ctx.measureText(g.label.toUpperCase()).width;
    ctx.strokeStyle = "rgba(129,140,248,0.22)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(PAD + lw + 20, y + 15);
    ctx.lineTo(W - PAD, y + 15);
    ctx.stroke();
    y += 62;

    for (const ex of g.exercises) {
      ctx.fillStyle = "#ffffff";
      ctx.font = FONT(30, "600");
      ctx.fillText(fit(ctx, ex.name, W - PAD * 2 - 40), PAD, y + 26);
      y += 46;

      // Sets as chips, three per row.
      let cx = PAD;
      let row = 0;
      const chipW = (W - PAD * 2 - 24) / 3;
      ex.sets.forEach((st, i) => {
        if (i > 0 && i % 3 === 0) {
          row += 1;
          cx = PAD;
        }
        const cy = y + row * 44;
        ctx.fillStyle = st.best ? "rgba(99,102,241,0.30)" : "rgba(255,255,255,0.06)";
        roundRect(ctx, cx, cy, chipW, 34, 12);
        ctx.fill();
        if (st.best) {
          ctx.strokeStyle = "rgba(129,140,248,0.5)";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.fillStyle = st.best ? "#ffffff" : "rgba(255,255,255,0.78)";
        ctx.font = FONT(22, st.best ? "700" : "500");
        ctx.fillText(fit(ctx, st.text, chipW - 24), cx + 14, cy + 23);
        cx += chipW + 12;
      });
      y += Math.ceil(ex.sets.length / 3) * 44;
    }
    y += 10;
  }

  // ---- Footer + watermark ----
  y = height - 78;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD, y - 34);
  ctx.lineTo(W - PAD, y - 34);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.font = FONT(22);
  ctx.fillText(card.footer, PAD, y);

  // Watermark, bottom right, in the app's blue.
  const mark = "Life Dashboard";
  ctx.font = FONT(26, "700");
  const mw = ctx.measureText(mark).width;
  const dot = 13;
  const mx = W - PAD - mw;
  const dg = ctx.createLinearGradient(mx - dot - 14, y - 14, mx - 14, y);
  dg.addColorStop(0, BLUE);
  dg.addColorStop(1, "#a78bfa");
  ctx.fillStyle = dg;
  ctx.beginPath();
  ctx.arc(mx - 16 - dot / 2, y - 8, dot / 2 + 3, 0, Math.PI * 2);
  ctx.fill();
  const wg = ctx.createLinearGradient(mx, y - 20, mx + mw, y);
  wg.addColorStop(0, BLUE_LIGHT);
  wg.addColorStop(1, "#c4b5fd");
  ctx.fillStyle = wg;
  ctx.fillText(mark, mx, y);

  return canvas.toDataURL("image/png");
}

/** The largest size in [min, max] at which the text still fits the width. */
function fitSize(ctx: CanvasRenderingContext2D, text: string, max: number, from: number, to: number, weight: string): number {
  for (let size = from; size > to; size -= 2) {
    ctx.font = FONT(size, weight);
    if (ctx.measureText(text).width <= max) return size;
  }
  return to;
}

/** Truncates with an ellipsis so a long name can never run off the card. */
function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s}…`;
}

export function downloadWorkoutImage(card: WorkoutCard, filename = "workout.png") {
  const url = renderWorkoutImage(card);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}
