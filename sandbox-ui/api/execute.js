import { getDb } from './_db.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Ensure DB table exists
  const db = getDb();
  await db.execute(`
    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT NOT NULL,
      logs TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      duration_ms INTEGER NOT NULL
    )
  `);

  const { runtime, code } = req.body || {};
  const startedAt = Date.now();
  
  // Simulate Execution latency
  await new Promise(r => setTimeout(r, 800));
  
  const durationMs = Date.now() - startedAt;
  const status = 'completed';
  const logs = `[SIMULATED VERCEL RUNTIME]\n$ sandbox run --runtime ${runtime || 'node'}\nBooting ephemeral serverless environment...\nApplying secure execution context.\nResult: Valid execution parsed.\nExit code 0 in ${durationMs}ms\nContainer teardown initiated.`;

  try {
    const result = await db.execute({
      sql: 'INSERT INTO runs (status, logs, created_at, duration_ms) VALUES (?, ?, ?, ?)',
      args: [status, logs, startedAt, durationMs]
    });
    
    return res.status(200).json({
      id: Number(result.lastInsertRowid),
      status,
      logs,
      created_at: startedAt,
      duration_ms: durationMs
    });
  } catch (err) {
    console.error('Execute error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
