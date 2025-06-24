const { makeBarChart } = require("./svgBarChart.js");

function svgTopCamps({ topCamps }) {
  return makeBarChart({
    data: topCamps.map((c) => ({ label: c.name, value: c.reviews })),
    title: "Top 5 camping-uri după recenzii",
  });
}

function svgTopRegions({ topRegions }) {
  return makeBarChart({
    data: topRegions.map((r) => ({ label: r.region, value: r.reviews })),
    title: "Top 5 regiuni după recenzii",
  });
}

module.exports = { svgTopCamps, svgTopRegions };
