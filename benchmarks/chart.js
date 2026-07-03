// Renders the grouped-bar benchmark SVG: 4 metric groups (LOC, tokens, cost,
// time), baseline gray at 100%, each arm as % of baseline, safety line below.
'use strict';

const COLORS = ['#9aa0a6', '#e8833a', '#34a853', '#8e5cf7', '#e84393', '#00b8d9'];

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

function renderChart(rel, opts = {}) {
  const arms = Object.keys(rel);
  const metrics = [
    ['loc', 'LOC'], ['tokens', 'tokens'], ['cost', 'cost'], ['time', 'time'],
  ];
  const W = 900, H = 560, plotTop = 90, plotBottom = 420, plotLeft = 70, plotRight = 40;
  const plotH = plotBottom - plotTop;
  const groupW = (W - plotLeft - plotRight) / metrics.length;
  const barW = Math.min(36, (groupW - 30) / arms.length);
  const maxV = Math.max(1.1, ...arms.flatMap(a => metrics.map(([k]) => rel[a][k] || 0))) * 1.15;
  const y = v => plotBottom - (v / maxV) * plotH;

  let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="system-ui,Segoe UI,Helvetica,Arial,sans-serif">`;
  s += `<rect width="${W}" height="${H}" fill="#0d1117"/>`;
  s += `<text x="${W / 2}" y="34" fill="#e6edf3" font-size="18" text-anchor="middle">Every metric vs the no-skill baseline</text>`;
  if (opts.subtitle) s += `<text x="${W / 2}" y="56" fill="#8b949e" font-size="12" text-anchor="middle">${esc(opts.subtitle)}</text>`;

  // legend
  let lx = plotLeft;
  arms.forEach((a, i) => {
    s += `<rect x="${lx}" y="66" width="10" height="10" fill="${COLORS[i % COLORS.length]}"/>`;
    s += `<text x="${lx + 15}" y="75" fill="#c9d1d9" font-size="11">${esc(a)}</text>`;
    lx += 15 + a.length * 6.4 + 22;
  });

  // gridlines 0/25/50/75/100
  for (const g of [0, 0.25, 0.5, 0.75, 1]) {
    s += `<line x1="${plotLeft}" y1="${y(g)}" x2="${W - plotRight}" y2="${y(g)}" stroke="#21262d" stroke-dasharray="${g === 1 ? '4 4' : 'none'}" stroke-width="1"/>`;
    s += `<text x="${plotLeft - 8}" y="${y(g) + 4}" fill="#8b949e" font-size="10" text-anchor="end">${g * 100}%</text>`;
  }
  s += `<text x="18" y="${(plotTop + plotBottom) / 2}" fill="#8b949e" font-size="10" transform="rotate(-90 18 ${(plotTop + plotBottom) / 2})" text-anchor="middle">% of baseline (lower is leaner)</text>`;

  metrics.forEach(([key, label], mi) => {
    const gx = plotLeft + mi * groupW + (groupW - arms.length * (barW + 6)) / 2;
    arms.forEach((a, ai) => {
      const v = rel[a][key] || 0;
      const bx = gx + ai * (barW + 6);
      const by = y(v);
      s += `<rect x="${bx}" y="${by}" width="${barW}" height="${plotBottom - by}" rx="2" fill="${COLORS[ai % COLORS.length]}"/>`;
      s += `<text x="${bx + barW / 2}" y="${by - 5}" fill="${COLORS[ai % COLORS.length]}" font-size="10" text-anchor="middle">${Math.round(v * 100)}%</text>`;
    });
    s += `<text x="${plotLeft + mi * groupW + groupW / 2}" y="${plotBottom + 22}" fill="#c9d1d9" font-size="12" text-anchor="middle">${label}</text>`;
    if (opts.baseline && opts.baseline[key] != null) {
      const b = opts.baseline[key];
      const txt = key === 'cost' ? `base $${Number(b).toFixed(2)}` : key === 'tokens' ? `base ${Math.round(b / 1000)}k` : key === 'time' ? `base ${Math.round(b)}s` : `base ${Math.round(b)}`;
      s += `<text x="${plotLeft + mi * groupW + groupW / 2}" y="${plotBottom + 38}" fill="#6e7681" font-size="10" text-anchor="middle">${txt}</text>`;
    }
  });

  // safety line
  s += `<text x="${plotLeft}" y="${plotBottom + 72}" fill="#8b949e" font-size="11">Safety, separate adversarial tier (guard-dropping traps). Higher is safer:</text>`;
  let sx = plotLeft;
  arms.forEach((a, i) => {
    const pct = Math.round((rel[a].safe ?? 1) * 100);
    const label = `${a} ${pct}%`;
    s += `<text x="${sx}" y="${plotBottom + 94}" fill="${COLORS[i % COLORS.length]}" font-size="12">${esc(label)}</text>`;
    sx += label.length * 7 + 30;
  });
  s += `<text x="${plotLeft}" y="${H - 14}" fill="#6e7681" font-size="10">Each bar = that arm's mean as % of the no-skill baseline (gray 100%). Lower is leaner / cheaper / faster.</text>`;
  s += `</svg>`;
  return s;
}

module.exports = { renderChart };
