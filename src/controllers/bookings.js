const {
  selectReservedDays,
  selectAllBookings,
  hasOverlap,
  insertBooking,
  cancelBookingById,
} = require("../services/db");
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

    const payload = campId
      ? await selectReservedDays(campId)
      : await selectAllBookings();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
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

  // verificare suprapunere data booking
  if (await hasOverlap(camp_site_id, start_date, end_date)) {
    res.writeHead(409, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Date range not available" }));
  }

  const booking = await insertBooking({
    user_id,
    camp_site_id,
    start_date,
    end_date,
  });
  res.writeHead(201, { "Content-Type": "application/json" });
  res.end(JSON.stringify(booking));
}

/* delete booking */
async function cancelBooking(req, res) {
  const match = req.url.match(/^\/api\/bookings\/(\d+)\/?$/);
  const id = match && match[1];
  if (!id) {
    res.writeHead(400, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ error: "Missing booking ID" }));
  }

  const booking = await cancelBookingById(id);
  if (!booking) {
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
