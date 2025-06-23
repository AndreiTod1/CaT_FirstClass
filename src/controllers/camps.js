const db = require("../services/db");
const parseJson = require("../utils/parseJSON");
const { URL } = require("url");

/*
 * GET /api/camps?filter1?filter2...
 * status 200, 500
 */
async function getAllCamps(req, res) {
  try {
    const { searchParams } = new URL(req.url, `http://${req.headers.host}`);

    const clauses = [];
    const values = [];
    let idx = 1;

    if (searchParams.has("region")) {
      clauses.push(`c.region ILIKE $${idx++}`);
      values.push(searchParams.get("region"));
    }

    if (searchParams.has("type")) {
      clauses.push(`c.type = $${idx++}`);
      values.push(searchParams.get("type"));
    }

    if (searchParams.has("price")) {
      clauses.push(`c.price <= $${idx++}`);
      values.push(Number(searchParams.get("price")));
    }

    if (searchParams.get("wifi") === "true") clauses.push("c.wifi IS TRUE");
    if (searchParams.get("parking") === "true")
      clauses.push("c.parking IS TRUE");
    if (searchParams.get("barbecue") === "true")
      clauses.push("c.barbecue IS TRUE");
    if (searchParams.get("shower") === "true") clauses.push("c.shower IS TRUE");
    if (searchParams.get("status") === "true") clauses.push("c.status IS TRUE");

    if (searchParams.has("minRating")) {
      clauses.push(`COALESCE(r.avg_rating,0) >= $${idx++}`);
      values.push(Number(searchParams.get("minRating")));
    }

    const sql = `
      SELECT
        c.*,
        COALESCE(r.avg_rating, 0)::numeric(3,2) AS avg_rating
      FROM camp_sites c
      LEFT JOIN (
        SELECT camp_site_id, AVG(rating) AS avg_rating
        FROM reviews
        GROUP BY camp_site_id
      ) r ON r.camp_site_id = c.id
      ${clauses.length ? "WHERE " + clauses.join(" AND ") : ""}
      ORDER BY c.id;
    `;

    const result = await db.query(sql, values);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.rows));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * POST /api/camps
 * JSON Body { name, description, latitude, longitude, capacity,region, price, type, wifi, shower, parking, barbecue, status }
 * Status 201, 400
 */
async function createCamp(req, res) {
  try {
    const {
      name,
      description,
      latitude,
      longitude,
      capacity,
      region,
      price,
      type,
      wifi,
      shower,
      parking,
      barbecue,

      status,
    } = await parseJson(req);

    const result = await db.query(
      `INSERT INTO camp_sites
        (name, description, latitude, longitude, capacity,
         region, price, type,
         wifi, shower, parking, barbecue, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        name,
        description,
        latitude,
        longitude,
        capacity,
        region,
        price,
        type,
        wifi,
        shower,
        parking,
        barbecue,
        status ?? true,
      ]
    );

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(JSON.stringify(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid request body" }));
  }
}

module.exports = function registerCampsRoutes(router) {
  router.add("GET", /^\/api\/camps(?:\?.*)?$/, getAllCamps);
  router.add("POST", /^\/api\/camps$/, createCamp);
};
