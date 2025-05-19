require('dotenv').config();
const http = require('http');
const path = require('path');

const Router = require('./router');
const serveStatic = require('./staticServer');
const registerCamps = require('./controllers/camps');

const router = new Router();

// Health check endpoint
router.add('GET', /^\/api\/health$/, (req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
});

// Mount controllers
registerCamps(router);

// Serve static files from /public
const PUBLIC_DIR = path.join(__dirname, '../public');
serveStatic(router, PUBLIC_DIR);

// Start HTTP server
const PORT = process.env.PORT || 3000;
http
  .createServer(async (req, res) => {
    try {
      await router.handle(req, res);
    } catch (err) {
      console.error(err);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  })
  .listen(PORT, () => {
    console.log(`🟢 Server listening on http://localhost:${PORT}`);
  });
