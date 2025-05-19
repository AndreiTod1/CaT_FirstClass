const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

// Serve static files (.html, .css, .js, images etc.)
module.exports = function (router, publicDir) {
  router.add('GET', /^(\/$|.*\.(html|css|js|png|jpg|jpeg|svg|ico))$/, (req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    const filePath = path.join(publicDir, urlPath);
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      res.writeHead(404);
      return res.end('Not Found');
    }

    const contentType = mime.lookup(filePath) || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
};
