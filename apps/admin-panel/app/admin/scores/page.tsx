'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = {
  user_id: string;
  actor_type: 'DRIVER' | 'PASSENGER';
  score: number;
  status: 'NONE' | 'WARNING' | 'LIMITED' | 'BLOCKED';
  badge?: { tier: string; label: string } | null;
  restriction_active?: { id: string; status: string; ends_at: string | null } | null;
};

const labelByStatus: Record<Row['status'], string> = {
  NONE: 'Excelente',
  WARNING: 'Bueno',
  LIMITED: 'Observación',
  BLOCKED: 'Restringido',
};

export default function AdminScoresPage() {
  const [actorType, setActorType] = useState<'DRIVER' | 'PASSENGER'>('DRIVER');
  const [rows, setRows] = useState<Row[]>([]);

  const load = async () => {
    const res = await fetch(`/api/admin/scores?actor_type=${actorType}`, { cache: 'no-store' });
    setRows(await res.json());
  };

  useEffect(() => { void load(); }, [actorType]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="text-2xl font-bold">Zippy Scores</h1>
        <div className="mt-3 flex gap-3">
          <button className={`rounded px-3 py-2 ${actorType === 'DRIVER' ? 'bg-cyan-700' : 'bg-slate-800'}`} onClick={() => setActorType('DRIVER')}>Drivers</button>
          <button className={`rounded px-3 py-2 ${actorType === 'PASSENGER' ? 'bg-cyan-700' : 'bg-slate-800'}`} onClick={() => setActorType('PASSENGER')}>Passengers</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900">
            <tr><th className="p-3">user_id</th><th>score</th><th>badge</th><th>status</th><th>peak blocked?</th><th>premium eligible?</th><th>restriction_active</th><th>ends_at</th><th></th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.user_id}:${r.actor_type}`} className="border-t border-slate-800">
                <td className="p-3">{r.user_id}</td>
                <td>{r.score}</td>
                <td>{r.badge?.label ?? '-'}</td>
                <td>{labelByStatus[r.status]} ({r.status})</td>
                <td>{r.status === "BLOCKED" ? "yes" : "no"}</td>
                <td>{(r.score ?? 0) >= (r.actor_type === "DRIVER" ? 75 : 60) ? "yes" : "no"}</td>
                <td>{r.restriction_active?.status ?? '-'}</td>
                <td>{r.restriction_active?.ends_at ? new Date(r.restriction_active.ends_at).toLocaleString() : '-'}</td>
                <td><Link className="text-cyan-400" href={`/admin/scores/${r.user_id}?actor_type=${r.actor_type}`}>Detalle</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
