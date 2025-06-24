const PDFDocument = require("pdfkit");
const SVGtoPDF = require("svg-to-pdfkit");
const fs = require("fs");
const dayjs = require("dayjs");

async function createPdf(stats, svgStr, outPath = "report.pdf") {
  if (!stats || !stats.topCamps) {
    throw new Error("Date statistici invalide sau lipsă");
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
    font: "Helvetica",
  });

  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  // Antet
  doc
    .fontSize(20)
    .text("GreenCamping — Daily Report", { align: "center" })
    .moveDown(0.5)
    .fontSize(10)
    .text(dayjs().format("YYYY-MM-DD HH:mm"), { align: "center" })
    .moveDown(1.5);

  // Sumar numeric - cu validare pentru avg_rating
  const avgRating =
    stats.avg_rating !== null && stats.avg_rating !== undefined
      ? typeof stats.avg_rating === "number"
        ? stats.avg_rating
        : parseFloat(stats.avg_rating)
      : 0;

  const displayRating = !isNaN(avgRating) ? avgRating.toFixed(2) : "0.00";

  doc
    .fontSize(12)
    .text(`Total camping-uri: ${stats.total_camps || 0}`)
    .text(`Total recenzii: ${stats.total_reviews || 0}`)
    .text(`Rating mediu: ${displayRating}`)
    .moveDown(1);

  // Tabel Top 5
  doc
    .fontSize(14)
    .text("Top 5 camping-uri după recenzii:", { underline: true })
    .moveDown(0.5);

  const col1 = 70;
  const col2 = 400;

  // Header tabel
  doc
    .fontSize(10)
    .text("Camping", col1, doc.y, { continued: true })
    .text("Nr. Recenzii", col2);

  // Linie separator
  doc
    .moveTo(col1, doc.y + 2)
    .lineTo(col2 + 50, doc.y + 2)
    .stroke();

  doc.moveDown(0.3);

  // tabel - cu validare
  if (stats.topCamps && Array.isArray(stats.topCamps)) {
    stats.topCamps.forEach((c, i) => {
      if (c && c.name !== undefined && c.reviews !== undefined) {
        const yPos = doc.y;
        doc
          .fontSize(10)
          .text(`${i + 1}. ${c.name}`, col1, yPos, {
            width: col2 - col1 - 20,
            continued: true,
          })
          .text(c.reviews.toString(), col2, yPos);
      }
    });
  }

  doc.moveDown(2);

  const remainingSpace = 792 - doc.y - 50; // A4 height - current Y - bottom margin
  const svgHeight = 400; // height-ul din SVG

  if (remainingSpace < svgHeight) {
    doc.addPage();
  }

  // Grafic SVG
  try {
    const cleanSvg = svgStr
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    doc
      .fontSize(14)
      .text("Grafic - Top 5 camping-uri după recenzii", { align: "center" })
      .moveDown(0.5);

    const maxWidth = 500;
    const maxHeight = 300;

    SVGtoPDF(doc, cleanSvg, 50, doc.y, {
      width: maxWidth,
      height: maxHeight,
      assumePt: true,
      preserveAspectRatio: "xMidYMid meet",
    });
  } catch (error) {
    console.error("Eroare la adăugarea SVG:", error);

    doc
      .moveDown(1)
      .fontSize(12)
      .text("Grafic indisponibil - Date în format tabel:", { align: "center" })
      .moveDown(0.5);

    if (stats.topCamps && Array.isArray(stats.topCamps)) {
      stats.topCamps.forEach((c, i) => {
        if (c && c.name !== undefined && c.reviews !== undefined) {
          doc.fontSize(10).text(`${i + 1}. ${c.name}: ${c.reviews} recenzii`);
        }
      });
    }
  }

  doc.end();

  return new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(outPath));
    stream.on("error", reject);
  });
}

module.exports = { createPdf };
