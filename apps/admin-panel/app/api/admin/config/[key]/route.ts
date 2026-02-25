import { cookies } from 'next/headers';
const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(_req: Request, { params }: { params: { key: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const res = await fetch(`${base}/api/admin/config/${params.key}`, { headers: { Authorization: `Bearer ${access}` }, cache: 'no-store' });
  return Response.json(await res.json(), { status: res.status });
}

export async function PUT(req: Request, { params }: { params: { key: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const body = await req.text();
  const res = await fetch(`${base}/api/admin/config/${params.key}`, { method: 'PUT', headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' }, body });
  return Response.json(await res.json(), { status: res.status });
}
