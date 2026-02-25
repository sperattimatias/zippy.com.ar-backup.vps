'use client';
import { useEffect, useState } from 'react';

export default function FraudUserPage({ params }: { params: { user_id: string } }) {
  const [data, setData] = useState<any>(null);
  const [reason, setReason] = useState('Manual hold');
  const load = () => fetch(`/api/admin/fraud/users/${params.user_id}/risk`, { cache: 'no-store' }).then((r) => r.json()).then(setData);
  useEffect(() => { void load(); }, [params.user_id]);
  const createHold = async () => { await fetch('/api/admin/fraud/holds/create', { method: 'POST', headers: { 'content-type':'application/json' }, body: JSON.stringify({ user_id: params.user_id, hold_type: 'FEATURE_LIMIT', reason }) }); await load(); };
  const release = async (id: string) => { await fetch(`/api/admin/fraud/holds/${id}/release`, { method: 'POST' }); await load(); };
  if (!data) return <main className="p-6">Loading...</main>;
  return <main className="mx-auto max-w-5xl p-6 space-y-4"><h1 className="text-2xl font-bold">Fraud User {params.user_id}</h1><p>Risk: {data.risk?.score ?? 0} ({data.risk?.level ?? 'LOW'})</p><div className="flex gap-2"><input className="bg-slate-900 p-2" value={reason} onChange={(e)=>setReason(e.target.value)} /><button className="rounded bg-amber-700 px-3 py-2" onClick={createHold}>Create Hold</button></div><ul>{(data.holds??[]).map((h:any)=><li key={h.id}>{h.hold_type} - {h.status} <button onClick={()=>release(h.id)}>release</button></li>)}</ul><pre className="text-xs">{JSON.stringify(data.signals, null, 2)}</pre></main>;
}
