const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");

module.exports = function handleUpload(req, destDir = "public/uploads") {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    fs.mkdirSync(destDir, { recursive: true });

    busboy.on("field", (name, val) => (fields[name] = val));

    busboy.on("file", (name, file, info) => {
      if (name !== "media") return file.resume(); // ignorăm alte fişiere
      const safeName = Date.now() + "-" + info.filename.replace(/\s+/g, "_");
      const absPath = path.join(destDir, safeName);
      const pubUrl = "/uploads/" + safeName;
      file.pipe(fs.createWriteStream(absPath));
      files.push({ field: name, path: absPath, url: pubUrl });
    });

    busboy.once("error", reject);
    busboy.once("finish", () => resolve({ fields, files }));
    req.pipe(busboy);
  });
};
