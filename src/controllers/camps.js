const db = require('../services/db');
const parseJson = require('../utils/parseJSON');

async function getAllCamps(req, res) {
  const result = await db.query('SELECT * FROM camp_sites ORDER BY id');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(result.rows));
}

async function createCamp(req, res) {
  try {
    const { name, description, latitude, longitude, capacity } = await parseJson(req);
    const result = await db.query(
      `INSERT INTO camp_sites (name, description, latitude, longitude, capacity)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description, latitude, longitude, capacity]
    );
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.rows[0]));
  } catch (err) {
    console.error(err);
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid request body' }));
  }
}

module.exports = function registerCampsRoutes(router) {
  router.add('GET', /^\/api\/camps$/, getAllCamps);
  router.add('POST', /^\/api\/camps$/, createCamp);
};
