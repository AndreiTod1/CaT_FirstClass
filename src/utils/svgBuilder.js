function makeSvg({ topCamps, total_reviews }) {
  const WIDTH = 500;
  const HEIGHT = 300;
  const MARGIN = { top: 40, right: 30, bottom: 80, left: 60 };
  const CHART_WIDTH = WIDTH - MARGIN.left - MARGIN.right;
  const CHART_HEIGHT = HEIGHT - MARGIN.top - MARGIN.bottom;

  // valorile pentru grafic
  const maxValue = Math.max(...topCamps.map((c) => c.reviews));
  if (maxValue === 0) maxValue = 1;

  const barWidth = (CHART_WIDTH / topCamps.length) * 0.6;
  const barSpacing = (CHART_WIDTH / topCamps.length) * 0.4;

  // gen bare
  const bars = topCamps.map((camp, index) => {
    const barHeight = (camp.reviews / maxValue) * CHART_HEIGHT;
    const x = MARGIN.left + index * (barWidth + barSpacing) + barSpacing / 2;
    const y = MARGIN.top + CHART_HEIGHT - barHeight;

    const simpleName = camp.name
      .replace(/[àáâãäå]/g, "a")
      .replace(/[èéêë]/g, "e")
      .replace(/[ìíîï]/g, "i")
      .replace(/[òóôõö]/g, "o")
      .replace(/[ùúûü]/g, "u")
      .replace(/[ăâî]/g, "a")
      .replace(/[șş]/g, "s")
      .replace(/[țţ]/g, "t")
      .substring(0, 12); // Limitează lungimea

    return `
      <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
            fill="#4A90E2" stroke="#2E5C8A" stroke-width="1"/>
      <text x="${x + barWidth / 2}" y="${y - 5}" text-anchor="middle" 
            font-size="11" font-family="Arial" fill="#000">
        ${camp.reviews}
      </text>
      <text x="${x + barWidth / 2}" y="${HEIGHT - 15}" text-anchor="middle" 
            font-size="9" font-family="Arial" fill="#000">
        ${simpleName}
      </text>
    `;
  });

  // liniile pentru axa Y
  const yAxisLines = [];
  const steps = Math.min(maxValue, 5);

  for (let i = 0; i <= steps; i++) {
    const value = Math.round((maxValue / steps) * i);
    const y = MARGIN.top + CHART_HEIGHT - (i / steps) * CHART_HEIGHT;

    yAxisLines.push(`
      <line x1="${MARGIN.left}" y1="${y}" x2="${
      MARGIN.left + CHART_WIDTH
    }" y2="${y}" 
            stroke="#E0E0E0" stroke-width="0.5"/>
      <text x="${MARGIN.left - 5}" y="${y + 3}" text-anchor="end" 
            font-size="9" font-family="Arial" fill="#666">
        ${value}
      </text>
    `);
  }

  // SVG
  const svg = `<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF"/>
  
  <text x="${
    WIDTH / 2
  }" y="20" text-anchor="middle" font-size="14" font-weight="bold" font-family="Arial" fill="#000">
    Top 5 camping-uri dupa recenzii
  </text>
  <text x="${
    WIDTH / 2
  }" y="35" text-anchor="middle" font-size="10" font-family="Arial" fill="#666">
    Total recenzii: ${total_reviews}
  </text>
  
  <line x1="${MARGIN.left}" y1="${MARGIN.top}" x2="${MARGIN.left}" y2="${
    MARGIN.top + CHART_HEIGHT
  }" stroke="#000" stroke-width="1"/>
  <line x1="${MARGIN.left}" y1="${MARGIN.top + CHART_HEIGHT}" x2="${
    MARGIN.left + CHART_WIDTH
  }" y2="${MARGIN.top + CHART_HEIGHT}" stroke="#000" stroke-width="1"/>
  
  ${yAxisLines.join("")}
  ${bars.join("")}
  
  <text x="20" y="${
    HEIGHT / 2
  }" text-anchor="middle" font-size="10" font-family="Arial" fill="#000" transform="rotate(-90 20 ${
    HEIGHT / 2
  })">
    Nr. recenzii
  </text>
</svg>`;

  return svg.trim();
}

module.exports = { makeSvg };
