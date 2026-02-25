'use client';
import { useEffect, useState } from 'react';

export default function LevelsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [actor, setActor] = useState<'DRIVER'|'PASSENGER'>('DRIVER');
  useEffect(() => { fetch(`/api/admin/levels?actor_type=${actor}`, { cache: 'no-store' }).then((r) => r.json()).then(setRows); }, [actor]);
  return <main className="mx-auto max-w-6xl p-6 space-y-4"><h1 className="text-2xl font-bold">Levels</h1><div className="flex gap-2"><button className="rounded bg-slate-800 px-3 py-2" onClick={() => setActor('DRIVER')}>Drivers</button><button className="rounded bg-slate-800 px-3 py-2" onClick={() => setActor('PASSENGER')}>Passengers</button></div><table className="w-full text-sm"><thead><tr><th>user_id</th><th>actor</th><th>tier</th><th>computed_at</th></tr></thead><tbody>{rows.map((r)=><tr key={r.id}><td>{r.user_id}</td><td>{r.actor_type}</td><td>{r.tier}</td><td>{new Date(r.computed_at).toLocaleString()}</td></tr>)}</tbody></table></main>;
}
