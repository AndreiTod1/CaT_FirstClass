// src/controllers/stats.js
const fs = require("fs");
const path = require("path");
const { getStats } = require("../services/statsService");
const { svgTopCamps, svgTopRegions } = require("../utils/svgBuilder");
const { createPdf } = require("../utils/pdfGenerator");

async function sendDailyReport(req, res) {
  try {
    // statistici din DB
    const stats = await getStats();

    // SVG inline (grafice)
    const svgs = {
      camps: svgTopCamps(stats),
      regions: svgTopRegions(stats),
    };

    // compunem PDF – fisier temporar /tmp
    const tmpDir = process.env.TMPDIR || "/tmp";
    const file = path.join(tmpDir, `report-${Date.now()}.pdf`);
    await createPdf(stats, svgs, file);

    //raspuns
    res.writeHead(200, {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="report-${Date.now()}.pdf"`,
    });
    fs.createReadStream(file)
      .on("close", () => fs.unlink(file, () => {})) // curatam fisier temp
      .pipe(res);
  } catch (err) {
    console.error("Eroare generare raport:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Eroare generare raport");
  }
}

module.exports = function registerStatsRoutes(router) {
  router.add("GET", /^\/api\/reports\/daily$/, sendDailyReport);
};
