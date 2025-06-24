const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const fs = require("fs");
const dayjs = require("dayjs");
const path = require("path");

async function createPdf(stats, svgs, outPath = "report.pdf") {
  if (!stats || !stats.topCamps) {
    throw new Error("Date statistici invalide sau lipsă");
  }

  //doc & font
  const doc = new PDFDocument({ size: "A4", margin: 50, bufferPages: true });
  doc.registerFont(
    "DejaVu",
    path.join(__dirname, "..", "..", "fonts", "DejaVuSans.ttf")
  );
  doc.font("DejaVu");

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  //antet
  doc
    .fontSize(20)
    .text("GreenCamping — Daily Report", { align: "center" })
    .moveDown(0.5)
    .fontSize(10)
    .text(dayjs().format("YYYY-MM-DD HH:mm"), { align: "center" })
    .moveDown(1.5);

  //sumar numeric
  const avg = parseFloat(stats.avg_rating) || 0;
  doc
    .fontSize(12)
    .text(`Total camping-uri: ${stats.total_camps || 0}`)
    .text(`Total recenzii:    ${stats.total_reviews || 0}`)
    .text(`Rating mediu:      ${avg.toFixed(2)}`)
    .moveDown(1.5);

  // tabel top camping-uri
  const col1 = 70,
    col2 = 400;

  doc
    .fontSize(14)
    .text("Top 5 camping-uri după recenzii:", { underline: true })
    .moveDown(0.5);
  doc
    .fontSize(10)
    .text("Camping", col1, doc.y, { continued: true })
    .text("Nr. Recenzii", col2);
  doc
    .moveTo(col1, doc.y + 2)
    .lineTo(col2 + 50, doc.y + 2)
    .stroke()
    .moveDown(0.3);

  stats.topCamps.forEach((c, i) => {
    const yPos = doc.y;
    doc
      .fontSize(10)
      .text(`${i + 1}. ${c.name}`, col1, yPos, {
        width: col2 - col1 - 20,
        continued: true,
      })
      .text(String(c.reviews), col2, yPos);
  });

  doc.moveDown(2);

  // helper pt SVG clean
  const clean = (svg) =>
    svg
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  //grafic camping-uri
  doc
    .fontSize(14)
    .text("Grafic – Top 5 camping-uri după recenzii", { align: "center" })
    .moveDown(0.5);
  SVGtoPDF(doc, clean(svgs.camps), 50, doc.y, {
    width: 500,
    height: 300,
    assumePt: true,
    preserveAspectRatio: "xMidYMid meet",
  });

  //grafic regiuni
  doc.addPage();
  doc.font("DejaVu");

  doc
    .fontSize(14)
    .text("Grafic – Top 5 regiuni după recenzii", { align: "center" })
    .moveDown(0.5);
  SVGtoPDF(doc, clean(svgs.regions), 50, doc.y, {
    width: 500,
    height: 300,
    assumePt: true,
    preserveAspectRatio: "xMidYMid meet",
  });

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

module.exports = { createPdf };
