'use client';

import { useEffect, useState } from 'react';

type Alert = { id: string; trip_id: string; type: string; status: string; severity: number; message: string; payload_json: unknown; created_at: string };

export default function AdminSafetyAlertsPage() {
  const [status, setStatus] = useState('');
  const [rows, setRows] = useState<Alert[]>([]);

  const load = async () => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/safety-alerts${qs}`, { cache: 'no-store' });
    setRows(await res.json());
  };

  useEffect(() => { void load(); }, [status]);

  const update = async (id: string, nextStatus: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED') => {
    await fetch(`/api/admin/safety-alerts/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });
    await load();
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="mb-4 text-2xl font-bold">Safety Alerts</h1>
        <div className="flex items-center gap-3">
          <label>Status</label>
          <select className="rounded bg-slate-900 p-2" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">ALL</option>
            <option value="OPEN">OPEN</option>
            <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="DISMISSED">DISMISSED</option>
          </select>
        </div>
      </section>

      <section className="space-y-3">
        {rows.map((a) => (
          <article key={a.id} className="rounded-xl border border-slate-800 p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">{a.type}</span>
              <span>severity {a.severity}</span>
              <span className="rounded bg-slate-800 px-2 py-1">{a.status}</span>
              <span>{new Date(a.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2">Trip: {a.trip_id}</p>
            <p className="text-slate-300">{a.message}</p>
            <pre className="mt-2 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(a.payload_json, null, 2)}</pre>
            <div className="mt-3 space-x-3 text-sm">
              <button className="text-cyan-400" onClick={() => update(a.id, 'ACKNOWLEDGED')}>Acknowledge</button>
              <button className="text-emerald-400" onClick={() => update(a.id, 'RESOLVED')}>Resolve</button>
              <button className="text-rose-400" onClick={() => update(a.id, 'DISMISSED')}>Dismiss</button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
