'use client';

import { useEffect, useState } from 'react';

const keys = ['score_thresholds', 'peak_hours', 'matching_weights', 'recovery_rules', 'premium_zones'];

export default function MeritConfigPage() {
  const [selected, setSelected] = useState(keys[0]);
  const [json, setJson] = useState('{}');

  const load = async (key: string) => {
    const res = await fetch(`/api/admin/config/${key}`, { cache: 'no-store' });
    const data = await res.json();
    setJson(JSON.stringify(data?.value_json ?? {}, null, 2));
  };

  useEffect(() => { void load(selected); }, [selected]);

  const save = async () => {
    await fetch(`/api/admin/config/${selected}`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ value_json: JSON.parse(json) }),
    });
    await load(selected);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-2xl font-bold">Merit Config</h1>
      <select className="rounded bg-slate-900 p-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
        {keys.map((k) => <option key={k} value={k}>{k}</option>)}
      </select>
      <textarea className="min-h-96 w-full rounded bg-slate-900 p-3 font-mono text-sm" value={json} onChange={(e) => setJson(e.target.value)} />
      <button className="rounded bg-cyan-700 px-4 py-2" onClick={save}>Guardar</button>
    </main>
  );
}
