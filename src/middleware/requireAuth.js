// src/middleware/requireAuth.js
const { parseCookies } = require("../controllers/auth");
const { verify } = require("../services/jwt");

module.exports = async function requireAuth(req, res, next) {
  console.log("[Auth] Cookie header:", req.headers.cookie);
  const cookies = parseCookies(req.headers.cookie || "");
  console.log("[Auth] Parsed cookies:", cookies);
  const token = cookies.token;
  if (!token) {
    console.warn("[Auth] No token, trimit 401");
    res.writeHead(401).end();
    return;
  }
  try {
    const payload = verify(token);
    console.log("[Auth] Token valid, payload:", payload);
    req.user = payload;
    next();
  } catch (err) {
    console.warn("[Auth] Token invalid, trimit 401", err);
    res.writeHead(401).end();
  }
};
