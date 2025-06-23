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
 * JSON Body { name, description, latitude, longitude, capacity,region, price, type, wifi, shower, parking, barbecue, status, image_url }
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
      image_url,
    } = await parseJson(req);

    const result = await db.query(
      `INSERT INTO camp_sites
        (name, description, latitude, longitude, capacity,
         region, price, type,
         wifi, shower, parking, barbecue, status, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
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
        image_url ?? "",
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

/*
 * PUT /api/camps/:id
 * JSON Body { name, description, latitude, longitude, capacity, region, price, type, wifi, shower, parking, barbecue, status, image_url }
 * Status 200, 400, 404, 500
 */
async function updateCamp(req, res) {
  // extrage id-ul
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  // parsează body-ul
  let body;
  try {
    body = await parseJson(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  // destructure
  const {
    name,
    description,
    latitude,
    longitude,
    capacity,
    region,
    price,
    type,
    image_url,
  } = body;

  const wifi = !!body.wifi;
  const shower = !!body.shower;
  const parking = !!body.parking;
  const barbecue = !!body.barbecue;

  const status = body.status === undefined ? true : !!body.status;

  try {
    const result = await db.query(
      `UPDATE camp_sites
          SET name        = $1,
              description = $2,
              latitude    = $3,
              longitude   = $4,
              capacity    = $5,
              region      = $6,
              price       = $7,
              type        = $8,
              wifi        = $9,
              shower      = $10,
              parking     = $11,
              barbecue    = $12,
              status      = $13,
              image_url   = $14
        WHERE id = $15
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
        status,
        image_url,
        id,
      ]
    );

    if (result.rowCount === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * DELETE /api/camps/:id
 * Status 204, 400, 404, 500
 */

async function deleteCamp(req, res) {
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  try {
    const result = await db.query(
      `DELETE FROM camp_sites WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(204);
    return res.end();
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
 * PUT /api/camps/:id/status
 * JSON Body { active: boolean }
 * status 200, 400, 404, 500
 */
async function toggleCampStatus(req, res) {
  // 1) extrage ID-ul din URL
  const match = req.url.match(/^\/api\/camps\/(\d+)$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing camp ID" }));
  }

  // 2) parsează body-ul JSON
  let body;
  try {
    body = await parseJson(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  const { active } = body;
  if (typeof active !== "boolean") {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Field 'active' must be boolean" }));
  }

  // 3) update status
  try {
    const result = await db.query(
      `UPDATE camp_sites
          SET status = $1
        WHERE id = $2
      RETURNING *`,
      [active, id]
    );

    if (result.rowCount === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Camp not found" }));
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.writeHead(500, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

module.exports = function registerCampsRoutes(router) {
  router.add("GET", /^\/api\/camps(?:\?.*)?$/, getAllCamps);
  router.add("POST", /^\/api\/camps$/, createCamp);
  router.add("PUT", /^\/api\/camps\/\d+$/, updateCamp);
  router.add("DELETE", /^\/api\/camps\/\d+$/, deleteCamp);
  router.add("PATCH", /^\/api\/camps\/\d+$/, toggleCampStatus);
};
