import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Log received client error for debugging
    // eslint-disable-next-line no-console
    console.error('[client-debug-log]', JSON.stringify(body, null, 2));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[client-debug-log] invalid payload', e);
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
