import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function POST(req: Request, { params }: { params: { user_id: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${base}/api/admin/users/${params.user_id}/score/adjust`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' },
    body,
  });
  return Response.json(await res.json(), { status: res.status });
}
