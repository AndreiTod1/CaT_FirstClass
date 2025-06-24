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

module.exports = {
  query: (text, params) => pool.query(text, params),
  findOrCreateOAuthUser,
  getUserById,
};
