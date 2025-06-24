const fs = require("fs");
const path = require("path");
const Busboy = require("busboy");

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 5;
module.exports = function handleUpload(req, destDir = "public/uploads") {
  return new Promise((resolve, reject) => {
    const busboy = Busboy({ headers: req.headers });
    const fields = {};
    const files = [];
    let fileCount = 0;
    const pending = [];

    fs.mkdirSync(destDir, { recursive: true });

    busboy.on("field", (name, val) => (fields[name] = val));

    busboy.on("file", (name, file, info) => {
      if (name !== "media") return file.resume();

      if (++fileCount > MAX_FILES) {
        file.resume();
        return busboy.emit("error", new Error("TOO_MANY_FILES"));
      }

      const safeName = Date.now() + "-" + info.filename.replace(/\s+/g, "_");
      const absPath = path.join(destDir, safeName);
      const pubUrl = "/uploads/" + safeName;

      const ws = fs.createWriteStream(absPath);
      file.pipe(ws);

      let bytes = 0;
      file.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_FILE_SIZE) {
          file.unpipe(ws);
          ws.destroy();
          fs.unlink(absPath, () => {});
          return busboy.emit("error", new Error("FILE_TOO_LARGE"));
        }
      });

      pending.push(
        new Promise((res, rej) => {
          ws.on("close", res);
          ws.on("error", rej);
        })
      );

      files.push({ field: name, path: absPath, url: pubUrl });
    });

    busboy.once("error", reject);
    busboy.once("finish", () => resolve({ fields, files }));
    req.pipe(busboy);
  });
};
