function makeBarChart({ data, title, subtitle = "" }) {
  const W = 500,
    H = 300;
  const M = { top: 30, right: 20, bottom: 70, left: 40 };
  const CW = W - M.left - M.right;
  const CH = H - M.top - M.bottom;

  const max = Math.max(...data.map((d) => d.value)) || 1;
  const barW = CW / data.length;

  const pxPerChar = 6; // 6 px la font-size 9
  const barTextLimit = Math.max(3, Math.floor((barW * 0.8) / pxPerChar));

  const bars = data
    .map((d, i) => {
      const barH = (d.value / max) * CH;
      const x = M.left + i * barW;
      const y = M.top + CH - barH;

      const label =
        d.label.length > barTextLimit
          ? d.label.slice(0, barTextLimit - 1) + "…"
          : d.label;

      return `
    <rect x="${x}" y="${y}" width="${barW * 0.8}" height="${barH}" fill="#666"/>
    <text x="${x + barW * 0.4}" y="${
        y - 4
      }" text-anchor="middle" font-size="10">
      ${d.value}
    </text>
    <text x="${x + barW * 0.4}" y="${H - M.bottom + 15}"
          text-anchor="middle" font-size="9">
      ${label}
    </text>`;
    })
    .join("");

  const grid = Array.from({ length: 6 }, (_, i) => {
    const v = Math.round((max / 5) * i);
    const y = M.top + CH - (CH / 5) * i;
    return `
      <line x1="${M.left}" y1="${y}" x2="${
      W - M.right
    }" y2="${y}" stroke="#ccc" stroke-width="0.5"/>
      <text x="${M.left - 4}" y="${
      y + 3
    }" text-anchor="end" font-size="8">${v}</text>`;
  }).join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${W}" height="${H}" fill="#fff"/>
  <line x1="${M.left}" y1="${M.top}"           x2="${M.left}"       y2="${
    H - M.bottom
  }" stroke="#000"/>
  <line x1="${M.left}" y1="${H - M.bottom}"    x2="${W - M.right}" y2="${
    H - M.bottom
  }" stroke="#000"/>
  ${grid}
  ${bars}
  <text x="${
    W / 2
  }" y="18" text-anchor="middle" font-size="12" font-weight="bold">${title}</text>
  ${
    subtitle
      ? `<text x="${
          W / 2
        }" y="32" text-anchor="middle" font-size="10">${subtitle}</text>`
      : ""
  }
</svg>`;
}

module.exports = { makeBarChart };
