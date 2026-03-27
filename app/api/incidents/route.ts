import { NextRequest, NextResponse } from 'next/server';

type Incident = {
  id: string;
  runNumber: string;
  carNumber: string;
  type: string;
  summary: string;
  timestamp: number;
};

// In-memory store — persists for the lifetime of the server process
const store: Incident[] = [];

export async function GET() {
  return NextResponse.json(store);
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

  const incident: Incident = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    runNumber,
    carNumber,
    type,
    summary: words.join(' '),
    timestamp: Date.now(),
  };

  store.push(incident);
  // Cap to 500 most recent
  if (store.length > 500) store.splice(0, store.length - 500);

  return NextResponse.json(incident, { status: 201 });
}
