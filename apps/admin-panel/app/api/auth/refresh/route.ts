import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function POST() {
  const store = cookies();
  const refreshToken = store.get('zippy_refresh_token')?.value;
  if (!refreshToken) return Response.json({ message: 'No refresh token' }, { status: 401 });

  const response = await fetch(`${gatewayBase}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
    cache: 'no-store',
  });

  const payload = await response.json();
  if (!response.ok) return Response.json(payload, { status: response.status });

  store.set('zippy_refresh_token', payload.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  store.set('zippy_access_token', payload.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });

  return Response.json({ ok: true });
}
