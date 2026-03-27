import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const key = process.env.CTA_TRAIN_API_KEY;
  if (!key) {
    return NextResponse.json({ error: 'CTA_TRAIN_API_KEY not set in .env.local' }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://lapi.transitchicago.com/api/1.0/ttpositions.aspx?key=${key}&rt=Brn&outputType=JSON`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed to reach CTA API' }, { status: 502 });
  }
}
