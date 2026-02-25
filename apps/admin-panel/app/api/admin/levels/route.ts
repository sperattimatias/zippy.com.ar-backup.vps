import { cookies } from 'next/headers';
const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;
export async function GET(req: Request) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const qs = new URL(req.url).searchParams.toString();
  const res = await fetch(`${base}/api/admin/levels${qs ? `?${qs}` : ''}`, { headers: { Authorization: `Bearer ${access}` }, cache: 'no-store' });
  return Response.json(await res.json(), { status: res.status });
}
