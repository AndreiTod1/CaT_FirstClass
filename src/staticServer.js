// utils/serveStatic.js
const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

module.exports = function serveStatic(router, publicDir) {
  const staticRegex =
    /^(\/$|\/uploads\/.+|.*\.(html|css|js|png|jpg|jpeg|svg|ico|mp4|webm|ogg))$/i;

  router.add("GET", staticRegex, staticHandler);
  router.add("HEAD", staticRegex, staticHandler);

  function staticHandler(req, res) {
    //determinam calea relativa
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";

    // eliminam slash-ul initial
    const relPath = urlPath.replace(/^\/+/, "");
    const filePath = path.join(publicDir, relPath);

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404).end("Not Found");
      return;
    }

    const contentType =
      mime.lookup(filePath.toLowerCase()) || "application/octet-stream";
    const isMedia =
      contentType.startsWith("video/") || contentType.startsWith("audio/");

    //VIDEO / AUDIO – suport Range
    if (isMedia) {
      const { size: fileSize } = fs.statSync(filePath);
      const range = req.headers.range;

      if (range) {
        const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
        const start = Number(startStr);
        const end = endStr ? Number(endStr) : fileSize - 1;

        if (start >= fileSize) {
          res.writeHead(416, { "Content-Range": `bytes */${fileSize}` }).end();
          return;
        }

        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": end - start + 1,
          "Content-Type": contentType,
        });
        fs.createReadStream(filePath, { start, end }).pipe(res);
        return;
      }

      // raspuns complet
      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": fileSize,
        "Accept-Ranges": "bytes",
      });
      if (req.method === "HEAD") return res.end();
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    //fisiere obisnuite
    res.writeHead(200, { "Content-Type": contentType });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  }
};
