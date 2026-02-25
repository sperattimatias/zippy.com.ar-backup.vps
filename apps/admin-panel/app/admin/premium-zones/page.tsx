'use client';

import { useEffect, useState } from 'react';

type Zone = { id: string; name: string; type: string; min_driver_score: number; min_passenger_score: number; is_active: boolean };

const defaultPolygon = JSON.stringify([{ lat: -34.6, lng: -58.4 }, { lat: -34.61, lng: -58.41 }, { lat: -34.6, lng: -58.42 }, { lat: -34.6, lng: -58.4 }], null, 2);

export default function PremiumZonesPage() {
  const [rows, setRows] = useState<Zone[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState('PREMIUM');
  const [minDriver, setMinDriver] = useState(75);
  const [minPassenger, setMinPassenger] = useState(60);
  const [polygon, setPolygon] = useState(defaultPolygon);

  const load = async () => {
    const res = await fetch('/api/admin/premium-zones', { cache: 'no-store' });
    setRows(await res.json());
  };
  useEffect(() => { void load(); }, []);

  const create = async () => {
    await fetch('/api/admin/premium-zones', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, type, min_driver_score: minDriver, min_passenger_score: minPassenger, polygon_json: JSON.parse(polygon) }) });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/premium-zones/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="mb-3 text-2xl font-bold">Premium Zones</h1>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded bg-slate-900 p-2" placeholder="name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="rounded bg-slate-900 p-2" value={type} onChange={(e) => setType(e.target.value)}>
            <option>PREMIUM</option><option>EVENT</option><option>TERMINAL</option><option>HIGH_DEMAND</option>
          </select>
          <input className="rounded bg-slate-900 p-2" type="number" value={minDriver} onChange={(e) => setMinDriver(Number(e.target.value))} />
          <input className="rounded bg-slate-900 p-2" type="number" value={minPassenger} onChange={(e) => setMinPassenger(Number(e.target.value))} />
        </div>
        <textarea className="mt-2 min-h-44 w-full rounded bg-slate-900 p-2 font-mono text-sm" value={polygon} onChange={(e) => setPolygon(e.target.value)} />
        <button className="mt-2 rounded bg-cyan-700 px-4 py-2" onClick={create}>Crear</button>
      </section>
      <section className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900"><tr><th className="p-3">Name</th><th>Type</th><th>Driver min</th><th>Passenger min</th><th>Active</th><th></th></tr></thead>
          <tbody>
            {rows.map((z) => <tr key={z.id} className="border-t border-slate-800"><td className="p-3">{z.name}</td><td>{z.type}</td><td>{z.min_driver_score}</td><td>{z.min_passenger_score}</td><td>{z.is_active ? 'yes' : 'no'}</td><td><button className="text-rose-400" onClick={() => remove(z.id)}>delete</button></td></tr>)}
          </tbody>
        </table>
      </section>
    </main>
  );
}
