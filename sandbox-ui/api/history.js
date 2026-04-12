import { getDb } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const db = getDb();
  try {
    // Graceful check if table exists
    const tableExists = await db.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='runs'");
    if (tableExists.rows.length === 0) {
      return res.status(200).json([]);
    }

    const { rows } = await db.execute(`
      SELECT id, status, logs, created_at, duration_ms 
      FROM runs 
      ORDER BY id DESC 
      LIMIT 12
    `);
    
    return res.status(200).json(rows);
  } catch (err) {
    console.error('History error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
