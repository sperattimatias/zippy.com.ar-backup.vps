import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function POST() {
  const store = cookies();
  const refreshToken = store.get('zippy_refresh_token')?.value;

  if (refreshToken) {
    await fetch(`${gatewayBase}/api/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: 'no-store',
    });
  }

  store.delete('zippy_refresh_token');
  store.delete('zippy_access_token');
  return Response.json({ message: 'ok' });
}
