// src/controllers/auth.js
const { google } = require("googleapis");
const db = require("../services/db");
const { sign, verify } = require("../services/jwt");

// Initialize OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_ID,
  process.env.GOOGLE_SECRET,
  process.env.GOOGLE_REDIRECT
);

function parseCookies(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((v) => v.split("="))
    .reduce((acc, [k, v]) => {
      acc[k.trim()] = decodeURIComponent(v);
      return acc;
    }, {});
}

function registerAuthRoutes(router) {
  // Start Google OAuth2 flow
  router.add("GET", /^\/api\/auth\/google$/, (req, res) => {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline", // pentru refresh_token
      scope: ["openid", "email", "profile"],
      prompt: "select_account",
    });
    res.writeHead(302, { Location: authUrl });
    res.end();
  });

  // Callback-ul Google
  router.add("GET", /^\/api\/auth\/google\/callback/, async (req, res) => {
    try {
      const fullUrl = new URL(req.url, `http://${req.headers.host}`);
      const code = fullUrl.searchParams.get("code");
      if (!code) throw new Error("No code in callback");

      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ auth: oauth2Client, version: "v2" });
      const { data: userinfo } = await oauth2.userinfo.get();

      const user = await db.findOrCreateOAuthUser({
        provider: "google",
        oauth_id: userinfo.id,
        email: userinfo.email,
        name: userinfo.name,
      });

      const jwtToken = sign({ id: user.id, role: user.role });

      res.writeHead(302, {
        "Set-Cookie": `token=${jwtToken}; HttpOnly; Path=/; Max-Age=${
          7 * 24 * 60 * 60
        }`,
        Location: "/",
      });
      res.end();
    } catch (err) {
      console.error("OAuth callback error:", err);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Authentication error");
    }
  });
}

function registerLogoutRoute(router) {
  router.add("POST", /^\/api\/auth\/logout$/, (req, res) => {
    res.writeHead(200, {
      "Set-Cookie": "token=; HttpOnly; Path=/; Max-Age=0",
      "Content-Type": "application/json",
    });
    res.end(JSON.stringify({ ok: true, message: "Logged out" }));
  });
}

function registerMeRoute(router) {
  router.add("GET", /^\/api\/auth\/me$/, async (req, res) => {
    try {
      const cookies = parseCookies(req.headers.cookie);
      const token = cookies.token;
      if (!token) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ ok: false, message: "Nu ești autentificat." })
        );
      }

      let payload;
      try {
        payload = verify(token);
      } catch (err) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ ok: false, message: "Token invalid." })
        );
      }

      const user = await db.getUserById(payload.id);
      if (!user) {
        res.writeHead(404, { "Content-Type": "application/json" });
        return res.end(
          JSON.stringify({ ok: false, message: "Utilizator negăsit." })
        );
      }

      const { id, email, role, name } = user;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, user: { id, email, role, name } }));
    } catch (err) {
      console.error("Error în /api/auth/me:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, message: "Eroare server." }));
    }
  });
}

module.exports = { registerAuthRoutes, registerLogoutRoute, registerMeRoute };
