'use client';

import { useEffect, useMemo, useState } from 'react';

type Detail = {
  score: { user_id: string; actor_type: 'DRIVER' | 'PASSENGER'; score: number; status: string };
  events: Array<{ id: string; type: string; delta: number; created_at: string }>;
  restrictions: Array<{ id: string; status: string; reason: string; ends_at: string | null; created_at: string }>;
};

export default function AdminScoreDetailPage({ params, searchParams }: { params: { user_id: string }; searchParams: { actor_type?: string } }) {
  const actorType = useMemo(() => (searchParams.actor_type === 'PASSENGER' ? 'PASSENGER' : 'DRIVER'), [searchParams.actor_type]);
  const [data, setData] = useState<Detail | null>(null);
  const [delta, setDelta] = useState(0);

  const load = async () => {
    const res = await fetch(`/api/admin/users/${params.user_id}/score?actor_type=${actorType}`, { cache: 'no-store' });
    setData(await res.json());
  };

  useEffect(() => { void load(); }, [params.user_id, actorType]);

  const blockHours = async (hours: number) => {
    const ends = new Date(Date.now() + hours * 3600 * 1000).toISOString();
    await fetch(`/api/admin/users/${params.user_id}/restrictions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actor_type: actorType, status: 'BLOCKED', reason: 'MANUAL_ADMIN', ends_at: ends, notes: `Manual block ${hours}h` }),
    });
    await load();
  };

  const lift = async (id: string) => {
    await fetch(`/api/admin/restrictions/${id}/lift`, { method: 'POST' });
    await load();
  };

  const adjust = async () => {
    await fetch(`/api/admin/users/${params.user_id}/score/adjust`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ actor_type: actorType, delta, notes: 'manual adjustment' }),
    });
    await load();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="text-2xl font-bold">Score {data?.score.user_id}</h1>
        <p>Actor: {actorType}</p>
        <p>Score: {data?.score.score} | Status: {data?.score.status}</p>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <button className="rounded bg-rose-700 px-3 py-2" onClick={() => blockHours(24)}>Bloquear 24h</button>
          <button className="rounded bg-rose-800 px-3 py-2" onClick={() => blockHours(24 * 7)}>Bloquear 7d</button>
          <div className="flex items-center gap-2">
            <input type="number" className="w-24 rounded bg-slate-900 p-2" value={delta} onChange={(e) => setDelta(Number(e.target.value))} />
            <button className="rounded bg-cyan-700 px-3 py-2" onClick={adjust}>Ajustar score</button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-2 text-xl">Restricciones</h2>
        <ul className="space-y-2 text-sm">
          {data?.restrictions?.map((r) => (
            <li key={r.id}>
              {new Date(r.created_at).toLocaleString()} — {r.status} / {r.reason} / ends: {r.ends_at ? new Date(r.ends_at).toLocaleString() : 'null'}
              <button className="ml-3 text-cyan-400" onClick={() => lift(r.id)}>Levantar</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-2 text-xl">Eventos (últimos 50)</h2>
        <ul className="space-y-1 text-sm">
          {data?.events?.map((e) => <li key={e.id}>{new Date(e.created_at).toLocaleString()} — {e.type} ({e.delta})</li>)}
        </ul>
      </section>
    </main>
  );
}
