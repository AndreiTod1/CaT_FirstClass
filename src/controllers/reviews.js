const { URL } = require("url");
const db = require("../services/db");
const parseJSON = require("../utils/parseJSON");
const requireAuth = require("../middleware/requireAuth");
const handleUpload = require("../utils/upload");
const path = require("path");
const fs = require("fs");

/*
 * POST /api/camps/{campId}/reviews
 * Body JSON  { userId, rating (1-5), ?comment, ?mediaUrls }
 * status 201,409, 500
 */
async function addReview(req, res) {
  let uploadedFiles = []; //pt clean-up
  try {
    // extract id
    const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
    const match = /^\/api\/camps\/(\d+)\/reviews$/.exec(pathname);
    if (!match) {
      res.writeHead(404);
      return res.end();
    }
    const campId = Number(match[1]);

    let userId,
      rating,
      comment = null,
      mediaUrls = [];

    if ((req.headers["content-type"] || "").startsWith("multipart/form-data")) {
      // --- multipart: folosim Busboy
      const { fields, files } = await handleUpload(
        req,
        path.join(process.cwd(), "public", "uploads") // de la radacina proiectului
      );

      uploadedFiles = files;

      if (!fields.payload) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Lipseşte câmpul payload" }));
      }

      ({ userId, rating, comment = null } = JSON.parse(fields.payload));
      mediaUrls = files.map((f) => f.url); // link-uri publice
    } else {
      // --- application/json clasic
      ({
        userId,
        rating,
        comment = null,
        mediaUrls = [],
      } = await parseJSON(req));
    }

    // validatation
    if (!userId || !rating || rating < 1 || rating > 5) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "userId & rating(1-5) obligatorii" })
      );
    }

    const { rowCount: campExists } = await db.query(
      `SELECT 1 FROM camp_sites WHERE id = $1`,
      [campId]
    );

    if (!campExists) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camping inexistent" }));
    }

    const result = await db.query(
      `INSERT INTO reviews
         (user_id, camp_site_id, rating, comment, media_urls)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [userId, campId, rating, comment, mediaUrls]
    );

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.rows[0]));
  } catch (err) {
    // !! error 23505 pg
    if (err.code === "23505") {
      uploadedFiles.forEach((f) => fs.unlink(f.path, () => {})); // nu mao facem upload
      res.writeHead(409, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({ error: "Ai recenzat deja acest camping" })
      );
    }
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Eroare internă" }));
  }
}

/*
 *  GET /api/camps/{campId}/reviews
 *  status 200
 */
async function getReviews(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const match = /^\/api\/camps\/(\d+)\/reviews$/.exec(pathname);
  if (!match) {
    res.writeHead(404);
    return res.end();
  }
  const campId = Number(match[1]);

  const result = await db.query(
    `SELECT r.*, u.email AS author
       FROM reviews r
       JOIN users u ON u.id = r.user_id
     WHERE r.camp_site_id = $1
     ORDER BY r.created_at DESC`,
    [campId]
  );

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(result.rows));
}

/*
 *  GET /api/camps/reviews
 *  status 200, 500
 */
async function getAllReviews(req, res) {
  try {
    const result = await db.query(
      `SELECT
         r.id,
         r.camp_site_id,
         r.user_id,
         u.email AS author,
         r.rating,
         r.comment,
         r.media_urls,
         r.likes,
         r.created_at
       FROM reviews r
       JOIN users u ON u.id = r.user_id
       ORDER BY r.created_at DESC`
    );

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.rows));
  } catch (err) {
    console.error("Error fetching all reviews:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * POST /api/reviews/:id/likes
 * status 200,409, 404, 401
 */
async function likeReview(req, res) {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const match = /^\/api\/reviews\/(\d+)\/likes$/.exec(pathname);
  if (!match) {
    res.writeHead(404).end();
    return;
  }
  const reviewId = Number(match[1]);
  const userId = req.user?.id;
  if (!userId) return res.writeHead(401).end();

  try {
    await db.query(
      `INSERT INTO review_likes (review_id,user_id) VALUES ($1,$2)`,
      [reviewId, userId]
    );
  } catch (err) {
    // 23505 = PK duplicate
    if (err.code === "23505") return res.writeHead(409).end();
    throw err;
  }

  // nr actual de like-uri
  const {
    rows: [{ likes }],
  } = await db.query(`SELECT likes FROM reviews WHERE id = $1`, [reviewId]);

  res
    .writeHead(200, { "Content-Type": "application/json" })
    .end(JSON.stringify({ likes }));
}

module.exports = function registerReviewRoutes(router) {
  router.add("GET", /^\/api\/reviews$/, getAllReviews);
  router.add("POST", /^\/api\/camps\/\d+\/reviews$/, addReview);
  router.add("GET", /^\/api\/camps\/\d+\/reviews(?:\?.*)?$/, getReviews);
  router.add("POST", /^\/api\/reviews\/\d+\/likes$/, async (req, res) => {
    await requireAuth(req, res, async () => {
      await likeReview(req, res);
    });
  });
};
