import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

async function callMe(accessToken: string) {
  return fetch(`${gatewayBase}/api/auth/me`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
}

export async function GET() {
  const store = cookies();
  const currentAccess = store.get('zippy_access_token')?.value;

  if (currentAccess) {
    const me = await callMe(currentAccess);
    if (me.ok) return Response.json(await me.json(), { status: 200 });
  }

  const refresh = store.get('zippy_refresh_token')?.value;
  if (!refresh) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const refreshed = await fetch(`${gatewayBase}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
    cache: 'no-store',
  });

  if (!refreshed.ok) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const tokens = await refreshed.json();

  store.set('zippy_refresh_token', tokens.refresh_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  store.set('zippy_access_token', tokens.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 15,
  });

  const me = await callMe(tokens.access_token);
  return Response.json(await me.json(), { status: me.status });
}
