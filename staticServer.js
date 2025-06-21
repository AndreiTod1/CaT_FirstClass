// staticServer.js
const fs = require("fs").promises;
const path = require("path");

function serveStatic(router, publicDir) {
  // orice GET pe /js/... /css/... sau /images/...
  router.add("GET", /^\/(js|css|images)\/.+$/, async (req, res) => {
    // fără query-string
    const urlPath = req.url.split("?")[0];
    const filePath = path.join(publicDir, urlPath);
    try {
      const data = await fs.readFile(filePath);
      // deduce extensia
      const ext = path.extname(filePath).slice(1);
      const types = {
        js: "application/javascript",
        css: "text/css",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        svg: "image/svg+xml",
      };
      res.writeHead(200, {
        "Content-Type": types[ext] || "application/octet-stream",
      });
      res.end(data);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    }
  });
}

module.exports = serveStatic;
