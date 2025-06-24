const db = require("./db");

async function getStats() {
  const [{ total_camps }] = (
    await db.query(`SELECT COUNT(*) total_camps FROM camp_sites`)
  ).rows;
  const [{ total_reviews }] = (
    await db.query(`SELECT COUNT(*) total_reviews FROM reviews`)
  ).rows;
  const [{ avg_rating }] = (
    await db.query(`SELECT ROUND(AVG(rating),2) avg_rating FROM reviews`)
  ).rows;

  const { rows: topCamps } = await db.query(`
    SELECT c.name, COUNT(r.id)::int AS reviews
    FROM camp_sites c
    JOIN reviews r ON r.camp_site_id = c.id
    GROUP BY c.id, c.name
    ORDER BY reviews DESC
    LIMIT 5
  `);

  const { rows: topRegions } = await db.query(`
    SELECT c.region, COUNT(r.id)::int AS reviews
    FROM camp_sites c
    JOIN reviews r ON r.camp_site_id = c.id
    GROUP BY c.region
    ORDER BY reviews DESC
    LIMIT 5
  `);

  return { total_camps, total_reviews, avg_rating, topCamps, topRegions };
}

module.exports = { getStats };
