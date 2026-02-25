import { cookies } from 'next/headers';

const gatewayBase = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function POST(request: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { id, ...rest } = body;
  const pathname = 'reject';

  const response = await fetch(`${gatewayBase}/api/admin/drivers/${id}/${pathname}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(rest),
    cache: 'no-store',
  });
  const payload = await response.json();
  return Response.json(payload, { status: response.status });
}
