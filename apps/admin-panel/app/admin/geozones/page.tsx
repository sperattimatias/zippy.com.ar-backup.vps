'use client';

import { useEffect, useState } from 'react';

type GeoZone = { id: string; name: string; type: 'SAFE' | 'CAUTION' | 'RED'; is_active: boolean; polygon_json: Array<{ lat: number; lng: number }> };

const emptyPolygon = JSON.stringify([{ lat: -34.6, lng: -58.4 }, { lat: -34.61, lng: -58.41 }, { lat: -34.6, lng: -58.42 }, { lat: -34.6, lng: -58.4 }], null, 2);

export default function AdminGeoZonesPage() {
  const [rows, setRows] = useState<GeoZone[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<'SAFE' | 'CAUTION' | 'RED'>('CAUTION');
  const [isActive, setIsActive] = useState(true);
  const [polygon, setPolygon] = useState(emptyPolygon);

  const load = async () => {
    const res = await fetch('/api/admin/geozones', { cache: 'no-store' });
    setRows(await res.json());
  };

  useEffect(() => { void load(); }, []);

  const onCreate = async () => {
    const parsed = JSON.parse(polygon);
    await fetch('/api/admin/geozones', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, type, is_active: isActive, polygon_json: parsed }),
    });
    setName('');
    await load();
  };

  const toggle = async (z: GeoZone) => {
    await fetch(`/api/admin/geozones/${z.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_active: !z.is_active }),
    });
    await load();
  };

  const remove = async (id: string) => {
    await fetch(`/api/admin/geozones/${id}`, { method: 'DELETE' });
    await load();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="mb-4 text-2xl font-bold">GeoZones</h1>
        <div className="grid gap-3 md:grid-cols-2">
          <input className="rounded bg-slate-900 p-2" placeholder="Nombre" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="rounded bg-slate-900 p-2" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="SAFE">SAFE</option><option value="CAUTION">CAUTION</option><option value="RED">RED</option>
          </select>
          <label className="flex items-center gap-2"><input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} /> Active</label>
          <button className="rounded bg-cyan-600 px-4 py-2" onClick={onCreate}>Crear</button>
        </div>
        <label className="mt-3 block text-sm text-slate-300">polygon_json (GeoJSON points simplificado)</label>
        <textarea className="mt-1 min-h-44 w-full rounded bg-slate-900 p-2 font-mono text-sm" value={polygon} onChange={(e) => setPolygon(e.target.value)} />
        <div className="mt-2 rounded bg-slate-900 p-3 text-sm text-slate-400">Preview placeholder (mapa real pendiente)</div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900"><tr><th className="p-3">Name</th><th>Type</th><th>Active</th><th>Actions</th></tr></thead>
          <tbody>
            {rows.map((z) => (
              <tr key={z.id} className="border-t border-slate-800">
                <td className="p-3">{z.name}</td><td>{z.type}</td><td>{z.is_active ? 'yes' : 'no'}</td>
                <td className="space-x-3"><button className="text-cyan-400" onClick={() => toggle(z)}>toggle</button><button className="text-rose-400" onClick={() => remove(z.id)}>delete</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
