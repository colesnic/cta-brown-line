import { NextRequest, NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

export const dynamic = 'force-dynamic';

function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  return neon(process.env.DATABASE_URL);
}

// Create table on first use (idempotent)
async function ensureTable() {
  const sql = getDb();
  await sql`
    CREATE TABLE IF NOT EXISTS incidents (
      id          TEXT PRIMARY KEY,
      run_number  TEXT NOT NULL,
      car_number  TEXT NOT NULL DEFAULT '',
      type        TEXT NOT NULL,
      summary     TEXT NOT NULL,
      timestamp   BIGINT NOT NULL
    )
  `;
}

export async function GET() {
  try {
    await ensureTable();
    const sql = getDb();
    const rows = await sql`
      SELECT id, run_number, car_number, type, summary, timestamp
      FROM incidents
      WHERE timestamp > ${Date.now() - 24 * 60 * 60 * 1000}
      ORDER BY timestamp DESC
      LIMIT 500
    `;
    const incidents = rows.map(r => ({
      id:        r.id,
      runNumber: r.run_number,
      carNumber: r.car_number,
      type:      r.type,
      summary:   r.summary,
      timestamp: Number(r.timestamp),
    }));
    return NextResponse.json(incidents);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: { runNumber?: unknown; carNumber?: unknown; type?: unknown; summary?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const runNumber  = String(body.runNumber  ?? '').trim();
  const carNumber  = String(body.carNumber  ?? '').trim();
  const type       = String(body.type       ?? '').trim();
  const rawSummary = String(body.summary    ?? '').trim();

  if (!runNumber) {
    return NextResponse.json({ error: 'Run number is required' }, { status: 400 });
  }

  const words = rawSummary.split(/\s+/).filter(Boolean);
  if (words.length !== 2) {
    return NextResponse.json({ error: 'Summary must be exactly two words' }, { status: 400 });
  }

  const incident = {
    id:        Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    runNumber,
    carNumber,
    type,
    summary:   words.join(' '),
    timestamp: Date.now(),
  };

  try {
    await ensureTable();
    const sql = getDb();
    await sql`
      INSERT INTO incidents (id, run_number, car_number, type, summary, timestamp)
      VALUES (
        ${incident.id},
        ${incident.runNumber},
        ${incident.carNumber},
        ${incident.type},
        ${incident.summary},
        ${incident.timestamp}
      )
    `;
    return NextResponse.json(incident, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Database error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
