const { Pool, types } = require("pg");
types.setTypeParser(1082, (val) => val);
const pool = new Pool({ connectionString: process.env.PG_CONN });

async function findOrCreateOAuthUser({ provider, oauth_id, email, name }) {
  let { rows } = await pool.query(
    "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2",
    [provider, oauth_id]
  );
  if (rows.length) {
    const user = rows[0];
    if (user.name !== name) {
      const { rows: updated } = await pool.query(
        `UPDATE users
           SET name = $1
         WHERE id = $2
         RETURNING *`,
        [name, user.id]
      );
      return updated[0];
    }
    return user;
  }

  ({ rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]));
  if (rows.length) {
    const existing = rows[0];
    const { rows: updated } = await pool.query(
      `UPDATE users
         SET oauth_provider = $1, oauth_id = $2, name = $3
       WHERE id = $4
       RETURNING *`,
      [provider, oauth_id, name, existing.id]
    );
    return updated[0];
  }

  ({ rows } = await pool.query(
    `INSERT INTO users (email, oauth_provider, oauth_id, role, name)
     VALUES ($1, $2, $3, 'member', $4)
     RETURNING *`,
    [email, provider, oauth_id, name]
  ));
  return rows[0];
}

async function getUserById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

//////////////////////////////////////////////////////// BOOKINGS ////////////////////////////////////////////////////////

async function selectReservedDays(campId) {
  const sql = `
    SELECT DISTINCT TO_CHAR(d::date,'YYYY-MM-DD') AS day
      FROM bookings b,
           generate_series(b.start_date, b.end_date, interval '1 day') AS d
     WHERE b.camp_site_id = $1
       AND b.status IN ('pending','confirmed')
     ORDER BY day;
  `;
  const { rows } = await pool.query(sql, [campId]);
  return rows.map((r) => r.day); // ["2025-07-26", …]
}

async function selectAllBookings() {
  const { rows } = await pool.query(
    "SELECT * FROM bookings ORDER BY created_at DESC"
  );
  return rows;
}

//VALIDATION

async function hasOverlap(camp_site_id, start_date, end_date) {
  const sql = `
    SELECT 1 FROM bookings
     WHERE camp_site_id = $1
       AND status IN ('pending','confirmed')
       AND daterange(start_date, end_date, '[]')
           && daterange($2::date, $3::date, '[]')
     LIMIT 1;
  `;
  const { rowCount } = await pool.query(sql, [
    camp_site_id,
    start_date,
    end_date,
  ]);
  return !!rowCount;
}

//MUTATIONS

async function insertBooking({ user_id, camp_site_id, start_date, end_date }) {
  const sql = `
    INSERT INTO bookings (user_id,camp_site_id,start_date,end_date,status)
    VALUES ($1,$2,$3,$4,'confirmed')
    RETURNING *;
  `;
  const { rows } = await pool.query(sql, [
    user_id,
    camp_site_id,
    start_date,
    end_date,
  ]);
  return rows[0];
}

async function cancelBookingById(id) {
  const sql = `
    UPDATE bookings
       SET status = 'cancelled'
     WHERE id = $1
     RETURNING *;
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0]; // undefined dacă nu există
}

//////////////////////////////////////////////////////// CAMPS ////////////////////////////////////////////////////////

function buildFilters(query) {
  const clauses = [];
  const values = [];
  let i = 1;

  if (query.region) {
    clauses.push(`c.region ILIKE $${i++}`);
    values.push(query.region);
  }
  if (query.type) {
    clauses.push(`c.type = $${i++}`);
    values.push(query.type);
  }
  if (query.price) {
    clauses.push(`c.price <= $${i++}`);
    values.push(Number(query.price));
  }

  ["wifi", "parking", "barbecue", "shower", "status"].forEach((k) => {
    if (query[k] === "true") clauses.push(`c.${k} IS TRUE`);
  });

  if (query.minRating) {
    clauses.push(`COALESCE(r.avg_rating,0) >= $${i++}`);
    values.push(Number(query.minRating));
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    values,
  };
}

/* ---------- API identic cu cel din controller ---------- */

async function getAllCampsService(query) {
  const { where, values } = buildFilters(query);
  const sql = `
    SELECT c.*, COALESCE(r.avg_rating,0)::numeric(3,2) AS avg_rating
      FROM camp_sites c
      LEFT JOIN (
        SELECT camp_site_id, AVG(rating) AS avg_rating
          FROM reviews GROUP BY camp_site_id
      ) r ON r.camp_site_id = c.id
      ${where}
    ORDER BY c.id;
  `;
  const { rows } = await pool.query(sql, values);
  return rows;
}

async function getCampByIdService(id) {
  const sql = `
    SELECT c.*, COALESCE(r.avg_rating,0)::numeric(3,2) AS avg_rating
      FROM camp_sites c
      LEFT JOIN (
        SELECT camp_site_id, AVG(rating) AS avg_rating
          FROM reviews GROUP BY camp_site_id
      ) r ON r.camp_site_id = c.id
      WHERE c.id = $1
      LIMIT 1;
  `;
  const { rows } = await pool.query(sql, [id]);
  return rows[0];
}

async function createCampService(data) {
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
    status = true,
    image_url = "",
  } = data;

  const sql = `
    INSERT INTO camp_sites
      (name,description,latitude,longitude,capacity,
       region,price,type,
       wifi,shower,parking,barbecue,status,image_url)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    RETURNING *;
  `;
  const { rows } = await pool.query(sql, [
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
  ]);
  return rows[0];
}

async function updateCampService(id, data) {
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
    status = true,
    image_url,
  } = data;

  const sql = `
    UPDATE camp_sites SET
      name=$1, description=$2, latitude=$3, longitude=$4, capacity=$5,
      region=$6, price=$7, type=$8,
      wifi=$9, shower=$10, parking=$11, barbecue=$12,
      status=$13, image_url=$14
    WHERE id=$15
    RETURNING *;
  `;
  const { rows } = await pool.query(sql, [
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
  ]);
  return rows[0];
}

async function deleteCampService(id) {
  const { rows } = await pool.query(
    `DELETE FROM camp_sites WHERE id=$1 RETURNING id;`,
    [id]
  );
  return rows[0]; // undefined dacă nu s-a șters
}

async function toggleCampStatusService(id, active) {
  const { rows } = await pool.query(
    `UPDATE camp_sites SET status=$1 WHERE id=$2 RETURNING *;`,
    [active, id]
  );
  return rows[0];
}

//////////////////////////////////////////////////////// REVIEWS ////////////////////////////////////////////////////////

async function campExists(campId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM camp_sites WHERE id = $1`,
    [campId]
  );
  return !!rowCount;
}

async function addReviewService({
  userId,
  campId,
  rating,
  comment,
  mediaUrls,
}) {
  if (!(await campExists(campId))) return null; // caller va răspunde 404

  const { rows } = await pool.query(
    `INSERT INTO reviews
       (user_id, camp_site_id, rating, comment, media_urls)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [userId, campId, rating, comment, mediaUrls]
  );
  return rows[0];
}

async function getReviewsService(campId) {
  const { rows } = await pool.query(
    `SELECT r.*, u.email AS author
       FROM reviews r
       JOIN users u ON u.id = r.user_id
     WHERE r.camp_site_id = $1
     ORDER BY r.created_at DESC`,
    [campId]
  );
  return rows;
}

async function getAllReviewsService() {
  const { rows } = await pool.query(
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
  return rows;
}

async function likeReviewService({ reviewId, userId }) {
  // va arunca eroare 23505 daca like-ul exista deja (pentru 409)
  await pool.query(
    `INSERT INTO review_likes (review_id, user_id) VALUES ($1, $2)`,
    [reviewId, userId]
  );

  const {
    rows: [{ likes }],
  } = await pool.query(`SELECT likes FROM reviews WHERE id = $1`, [reviewId]);

  return likes;
}

//////////////////////////////////////////////////////// USERS ////////////////////////////////////////////////////////

async function getAllUsersService() {
  const { rows } = await pool.query(
    `SELECT id, email, role, created_at
       FROM users
     ORDER BY id`
  );
  return rows;
}

async function updateUserService(id, role) {
  const { rows } = await pool.query(
    `UPDATE users
        SET role = $1
      WHERE id = $2
  RETURNING id, email, role, created_at, name`,
    [role, id]
  );
  return rows[0] ?? null;
}

async function deleteUserService(id) {
  const result = await pool.query(
    `DELETE FROM users
        WHERE id = $1
  RETURNING id`,
    [id]
  );
  return !!result.rowCount;
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  findOrCreateOAuthUser,
  getUserById,
  selectReservedDays,
  selectAllBookings,
  hasOverlap,
  insertBooking,
  cancelBookingById,

  getAllCampsService,
  getCampByIdService,
  createCampService,
  updateCampService,
  deleteCampService,
  toggleCampStatusService,

  addReviewService,
  getReviewsService,
  getAllReviewsService,
  likeReviewService,

  getAllUsersService,
  updateUserService,
  deleteUserService,
};
