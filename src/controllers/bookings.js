const db = require("../services/db");
const parseJson = require("../utils/parseJSON");

/*
  GET /api/bookings?campId=123
  status 200, 500
  returnare zile rezervate pentru un anumit camp
*/
async function getBookings(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const campId = url.searchParams.get("campId");

    if (campId) {
      const sql = `
        SELECT DISTINCT TO_CHAR(d::date,'YYYY-MM-DD') AS day
          FROM bookings b,
               generate_series(
              b.start_date,               
              b.end_date - interval '1 day',
              interval '1 day'
            ) AS d
         WHERE b.camp_site_id = $1
           AND b.status IN ('pending','confirmed')
         ORDER BY day;
      `;
      const { rows } = await db.query(sql, [campId]);
      const days = rows.map((r) => r.day); // ex: ["2025-07-26"]
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify(days));
    }

    // fallback: toate booking-urile
    const { rows } = await db.query(
      "SELECT * FROM bookings ORDER BY created_at DESC"
    );
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(rows));
  } catch (err) {
    console.error("getBookings:", err);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
}

/*
  POST /api/bookings
  status 201, 400, 409
  body: { user_id, camp_site_id, start_date, end_date }
  creeaza booking
*/
async function createBooking(req, res) {
  let body;
  try {
    body = await parseJson(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Invalid JSON" }));
  }

  const { user_id, camp_site_id, start_date, end_date } = body || {};
  if (!user_id || !camp_site_id || !start_date || !end_date) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing required fields" }));
  }
  if (new Date(end_date) < new Date(start_date)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({ error: "`end_date` must be after `start_date`" })
    );
  }

  // verificare suprapunere
  // se exclude ziua de checkout
  const overlapSQL = `
   SELECT 1 FROM bookings
    WHERE camp_site_id = $1
    AND status IN ('confirmed')
    
    AND daterange(start_date, end_date, '[)')
        && daterange($2::date, $3::date, '[)')
  `;
  const overlap = await db.query(overlapSQL, [
    camp_site_id,
    start_date,
    end_date,
  ]);
  if (overlap.rowCount) {
    res.writeHead(409, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Date range not available" }));
  }

  const insertSQL = `
    INSERT INTO bookings (user_id,camp_site_id,start_date,end_date,status)
    VALUES ($1,$2,$3,$4,'confirmed')
    RETURNING *;
  `;
  const { rows } = await db.query(insertSQL, [
    user_id,
    camp_site_id,
    start_date,
    end_date,
  ]);
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify(rows[0]));
}

/* delete booking */
async function cancelBooking(req, res) {
  const match = req.url.match(/^\/api\/bookings\/(\d+)\/?$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing booking ID" }));
  }

  const { rows } = await db.query(
    `UPDATE bookings SET status='cancelled' WHERE id=$1 RETURNING *`,
    [id]
  );
  if (!rows.length) {
    res.writeHead(404, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Booking not found" }));
  }
  res.writeHead(204);
  res.end();
}

module.exports = function registerBookings(router) {
  router.add("GET", /^\/api\/bookings\/?(?:\?.*)?$/, getBookings);
  router.add("POST", /^\/api\/bookings\/?$/, createBooking);
  router.add("DELETE", /^\/api\/bookings\/\d+\/?$/, cancelBooking);
};
