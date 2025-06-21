const { Pool } = require("pg");
const pool = new Pool({ connectionString: process.env.PG_CONN });

async function findOrCreateOAuthUser({ provider, oauth_id, email }) {
  let { rows } = await pool.query(
    "SELECT * FROM users WHERE oauth_provider = $1 AND oauth_id = $2",
    [provider, oauth_id]
  );
  if (rows.length) {
    return rows[0];
  }

  ({ rows } = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]));
  if (rows.length) {
    const existing = rows[0];
    const updateRes = await pool.query(
      `UPDATE users SET oauth_provider = $1, oauth_id = $2 WHERE id = $3 RETURNING *`,
      [provider, oauth_id, existing.id]
    );
    return updateRes.rows[0];
  }

  ({ rows } = await pool.query(
    `INSERT INTO users (email, oauth_provider, oauth_id, role)
     VALUES ($1, $2, $3, 'member')
     RETURNING *`,
    [email, provider, oauth_id]
  ));
  return rows[0];
}

async function getUserById(id) {
  const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return result.rows[0];
}

module.exports = {
  query: (text, params) => pool.query(text, params),
  findOrCreateOAuthUser,
  getUserById,
};
