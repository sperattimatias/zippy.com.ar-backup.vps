import { cookies } from 'next/headers';

const base = process.env.API_GATEWAY_INTERNAL_URL ?? process.env.NEXT_PUBLIC_API_GATEWAY_URL!;

export async function GET(req: Request, { params }: { params: { user_id: string } }) {
  const access = cookies().get('zippy_access_token')?.value;
  if (!access) return Response.json({ message: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const actorType = searchParams.get('actor_type') ?? 'DRIVER';
  const res = await fetch(`${base}/api/admin/users/${params.user_id}/score?actor_type=${encodeURIComponent(actorType)}`, {
    headers: { Authorization: `Bearer ${access}` },
    cache: 'no-store',
  });
  return Response.json(await res.json(), { status: res.status });
}
