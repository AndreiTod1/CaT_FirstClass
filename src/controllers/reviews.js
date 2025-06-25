const { URL } = require("url");
const {
  addReviewService,
  getReviewsService,
  getAllReviewsService,
  likeReviewService,
} = require("../services/db");
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
      let fields, files;

      try {
        ({ fields, files } = await handleUpload(
          req,
          path.join(process.cwd(), "public", "uploads")
        ));
      } catch (e) {
        if (e.message === "FILE_TOO_LARGE")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Fișierul depășește 10 MB" }));
        if (e.message === "TOO_MANY_FILES")
          return res
            .writeHead(413, { "Content-Type": "application/json" })
            .end(JSON.stringify({ error: "Maxim 5 fișiere permise" }));
        throw e; //altceva
      }

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

    const inserted = await addReviewService({
      userId,
      campId,
      rating,
      comment,
      mediaUrls,
    });

    if (!inserted) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camping inexistent" }));
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(inserted));
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
  const reviews = await getReviewsService(campId);

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify(reviews));
}

/*
 *  GET /api/camps/reviews
 *  status 200, 500
 */
async function getAllReviews(req, res) {
  try {
    const reviews = await getAllReviewsService();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(reviews));
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
    const likes = await likeReviewService({ reviewId, userId });
    res
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify({ likes }));
  } catch (err) {
    // 23505 = PK duplicate
    if (err.code === "23505") return res.writeHead(409).end();
    throw err;
  }
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
