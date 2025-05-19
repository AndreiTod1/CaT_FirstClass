const Busboy = require('busboy');
const fs = require('fs');
const path = require('path');

/*
// parse multipart/form-data and save files in UPLOAD_DIR
module.exports = function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const busboy = new Busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    busboy.on('field', (name, val) => {
      fields[name] = val;
    });

    busboy.on('file', (fieldname, fileStream, info) => {
      const { filename } = info;
      const uploadDir =
        process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const saveTo = path.join(uploadDir, `${Date.now()}-${filename}`);
      const writeStream = fs.createWriteStream(saveTo);
      fileStream.pipe(writeStream);
      files.push({ field: fieldname, path: saveTo });
    });

    busboy.on('close', () => resolve({ fields, files }));
    busboy.on('error', err => reject(err));

    req.pipe(busboy);
  });
};
*/