'use client';

import { useEffect, useState } from 'react';

type Detail = {
  id: string;
  user_id: string;
  status: string;
  rejection_reason?: string;
  documents: Array<{ id: string; type: string; get_url: string }>;
  events: Array<{ id: string; type: string; actor_user_id: string; created_at: string }>;
};

export default function DriverDetailPage({ params }: { params: { id: string } }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [reason, setReason] = useState('');

  async function reload() {
    const data = await fetch(`/api/admin/drivers/${params.id}`, { cache: 'no-store' }).then((r) => r.json());
    setDetail(data);
  }

  useEffect(() => { reload(); }, [params.id]);

  async function action(kind: 'review-start' | 'approve' | 'reject' | 'suspend') {
    await fetch(`/api/admin/drivers/${kind}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: params.id, reason }),
    });
    await reload();
  }

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-xl border border-slate-800 p-4">
        <h1 className="text-2xl font-bold">Driver {detail?.user_id}</h1>
        <p className="text-slate-300">Estado: {detail?.status}</p>
        {detail?.rejection_reason && <p className="text-rose-400">Motivo: {detail.rejection_reason}</p>}
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-3 text-xl">Documentos</h2>
        <ul className="space-y-2">
          {detail?.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between"><span>{d.type}</span><a className="text-cyan-400" href={d.get_url} target="_blank">Ver</a></li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-3 text-xl">Acciones</h2>
        <input className="mb-3 w-full rounded bg-slate-800 p-2" placeholder="Motivo (reject/suspend)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <div className="flex gap-2">
          <button className="rounded bg-slate-700 px-3 py-2" onClick={() => action('review-start')}>Iniciar revisión</button>
          <button className="rounded bg-emerald-600 px-3 py-2" onClick={() => action('approve')}>Aprobar</button>
          <button className="rounded bg-amber-600 px-3 py-2" onClick={() => action('reject')}>Rechazar</button>
          <button className="rounded bg-rose-700 px-3 py-2" onClick={() => action('suspend')}>Suspender</button>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="mb-3 text-xl">Eventos</h2>
        <ul className="space-y-1 text-sm">
          {detail?.events.map((e) => (
            <li key={e.id}>{new Date(e.created_at).toLocaleString()} — {e.type} — actor {e.actor_user_id}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
