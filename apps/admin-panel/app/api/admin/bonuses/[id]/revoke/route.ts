import { cookies } from 'next/headers';
const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.json();
  const res = await fetch(`${base}/api/admin/bonuses/${params.id}/revoke`, { method: 'POST', headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return Response.json(await res.json(), { status: res.status });
}
