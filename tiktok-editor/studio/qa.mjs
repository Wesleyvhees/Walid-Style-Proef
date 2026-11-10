// Automatische eindcontrole (Wes 2026-11-10, systeemanalyse A1/A2): schat per beat waar hij in beeld staat en
// verschuift hem als hij buiten beeld valt, over de ondertitels, achter de TikTok-knoppen of midden over het gezicht.
// Schattingen (geen pixelmeting): liever een beat te veel melden dan een fout missen.
const W = 1080, H = 1920;
const UI = [
  { n: "TikTok-knoppen rechts", x0: 950, y0: 880, x1: 1080, y1: 1680 },
  { n: "TikTok-beschrijving onderin", x0: 0, y0: 1690, x1: 1080, y1: 1920 },
  { n: "TikTok-tabs bovenin", x0: 0, y0: 0, x1: 1080, y1: 205 },
];
const inter = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
const area = (a) => Math.max(1, (a.x1 - a.x0) * (a.y1 - a.y0));
const len = (s) => String(s ?? "").length;

function box(b) {
  const sz = b.size;
  if (b.type === "pop") {
    const look = b.look ?? "sticker";
    const s = sz ?? (look === "impact" ? 170 : look === "big" ? 150 : look === "stamp" ? 120 : 46);
    const mono = look === "label";
    const w = len(b.text) * s * (mono ? 0.62 : 0.56) + (mono ? 90 : 40);
    const h = s * (mono ? 1.5 : 1.15) + (mono ? 36 : 0) + (b.sub ? 50 : 0);
    const x = b.x ?? 540, y = b.y ?? (look === "big" || look === "impact" ? 1040 : 1120);
    return { x0: x - w / 2, x1: x + w / 2, y0: y - h / 2, y1: y + h / 2, center: true };
  }
  if (b.type === "stack") {
    const s = sz ?? 44, n = (b.items ?? []).length;
    const w = Math.max(...(b.items ?? [{ text: "" }]).map((i) => len(i.text))) * s * 0.62 + 52;
    const x = b.x ?? 70, y = b.y ?? 380;
    return { x0: x, x1: x + w, y0: y, y1: y + n * (s * 1.5 + 28) + (n - 1) * 16 };
  }
  if (b.type === "emoji") { const s = sz ?? 280, x = b.x ?? 780, y = b.y ?? 520; return { x0: x - s * 0.32, x1: x + s * 0.32, y0: y - s / 2, y1: y + s / 2, center: true, soft: true }; }
  if (b.type === "image") { const w = b.w ?? 560, x = b.x ?? 470, y = b.y ?? 300; return { x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + w * 0.75 + 28, soft: true }; }
  if (b.type === "volgstempel") { const w = b.width ?? 900, x = b.x ?? 540, y = b.y ?? 980; return { x0: x - w / 2, x1: x + w / 2, y0: y - w * 0.28, y1: y + w * 0.28, center: true }; }
  if (b.type === "prompt") { const y = b.y ?? 230; return { x0: 50, x1: 1030, y0: y, y1: y + 190 }; }
  if (b.type === "checklist") { const w = b.w ?? 560, x = b.x ?? 540 - w / 2, y = b.y ?? 230; return { x0: x, x1: x + w, y0: y, y1: y + 90 + (b.items ?? []).length * 70 }; }
  return null;
}

function move(b, dx, dy) {
  if (dx) b.x = Math.round((b.x ?? (b.type === "stack" ? 70 : b.type === "emoji" ? 780 : b.type === "image" ? 470 : 540)) + dx);
  if (dy) b.y = Math.round((b.y ?? (b.type === "pop" ? ((b.look === "big" || b.look === "impact") ? 1040 : 1120) : b.type === "volgstempel" ? 980 : b.type === "stack" ? 380 : 230)) + dy);
}

export function qa(sb) {
  const report = [];
  const faces = sb.layout?.faces ?? [];
  const lfps = sb.layout?.fps ?? 4;
  const split = sb.split ?? [];
  const inSplit = (t) => split.some((c) => t >= c.start && t < c.end);
  const capY = (t) => (inSplit(t) ? 925 : typeof sb.captions?.y === "number" ? sb.captions.y : 1264);
  const faceAt = (t) => {
    const i = Math.max(0, Math.min(faces.length - 1, Math.floor(t * lfps)));
    for (let d = 0; d < 12; d++) { const f = faces[i - d] ?? faces[i + d]; if (f) return f; }
    return null;
  };
  const hidesCaps = (b) => b.type === "follow" || b.type === "chart" || (b.type === "volgstempel" && (b.y ?? 980) > 900);
  for (const b of sb.beats) {
    if (b.qa === false || b.type === "hook") continue;
    let bx = box(b);
    if (!bx) continue;
    const t = (b.start + b.end) / 2;
    const tag = `${b.type}${b.text ? ` '${b.text}'` : b.name ? ` '${b.name}'` : ""} @${b.start}s`;
    // 1. buiten beeld
    const dx = bx.x0 < 16 ? 16 - bx.x0 : bx.x1 > W - 16 ? W - 16 - bx.x1 : 0;
    if (dx && !bx.soft) { move(b, dx, 0); report.push(`${tag}: viel ${Math.round(Math.abs(dx))} px buiten beeld → verschoven`); bx = box(b); }
    // 2. over de ondertitels (alleen als die op dat moment zichtbaar zijn)
    const capsVisible = !sb.beats.some((o) => o !== b && hidesCaps(o) && t >= o.start && t < o.end) && !hidesCaps(b);
    if (capsVisible) {
      const cy = capY(t), cap = { x0: 60, x1: 1020, y0: cy - 10, y1: cy + 105 };
      if (inter(bx, cap) > 0.05 * area(bx)) {
        const dy = cap.y0 - 16 - bx.y1;
        move(b, 0, dy); report.push(`${tag}: stond over de ondertitels → ${Math.round(-dy)} px omhoog`); bx = box(b);
      }
    }
    // 3. achter TikTok-knoppen
    for (const z of UI) if (inter(bx, z) > 0.2 * area(bx)) report.push(`${tag}: valt deels achter ${z.n} (controleer)`);
    // 4. midden over het gezicht (niet tijdens split-screen; figuurtjes en foto's alleen melden)
    const f = !inSplit(t) && faceAt(t);
    if (f) {
      const [fx, fy, fw, fh] = f;
      const core = { x0: fx + fw * 0.15, x1: fx + fw * 0.85, y0: fy + fh * 0.2, y1: fy + fh * 1.0 };
      if (inter(bx, core) > 0.3 * area(bx)) {
        const h = bx.y1 - bx.y0, room = fy - 30 - h;
        // label dat bij een figuurtje/foto hoort (zelfde moment, raakt elkaar): niet wegzetten, alleen melden
        const attached = sb.beats.some((o) => o !== b && (o.type === "emoji" || o.type === "image") && o.start < b.end && o.end > b.start && box(o) && inter(bx, { ...box(o), y1: box(o).y1 + 140 }) > 0);
        if (!bx.soft && !attached && room >= 215) { move(b, 0, room - bx.y0); report.push(`${tag}: stond over je gezicht → boven je hoofd gezet`); }
        else report.push(`${tag}: raakt je gezicht (controleer in de stills)`);
      }
    }
  }
  // A2: ondertitels – verborgen woorden en 'één'
  const hidden = sb.beats.filter(hidesCaps);
  const lost = (sb.words ?? []).filter((w) => hidden.some((h) => w.s >= h.start && w.s < h.end)).map((w) => w.w);
  if (lost.length) report.push(`ondertitels verborgen bij: "${lost.join(" ")}" (door ${hidden.map((h) => h.type).join(", ")})`);
  for (const w of sb.words ?? []) if (/^(één|eén|éen)\b/i.test(w.w)) report.push(`'${w.w}' @${w.s}s wordt 'een' in de ondertitels`);
  console.log(report.length ? "QA:\n  " + report.join("\n  ") : "QA: alles vrij (gezicht, ondertitels, randen, TikTok-knoppen)");
  return report;
}
