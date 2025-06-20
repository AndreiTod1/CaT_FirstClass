//match methond + regex on URL
class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pathRegex, handler) {
    this.routes.push({ method, pathRegex, handler });
  }

  async handle(req, res) {
    for (const r of this.routes) {
      if (req.method === r.method && r.pathRegex.test(req.url)) {
        return r.handler(req, res);
      }
    }
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
}

module.exports = Router;
