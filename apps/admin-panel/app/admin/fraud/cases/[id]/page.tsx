'use client';
import { useEffect, useState } from 'react';

export default function FraudCaseDetail({ params }: { params: { id: string } }) {
  const [data, setData] = useState<any>(null);
  const [notes, setNotes] = useState('Reviewed');
  const load = () => fetch(`/api/admin/fraud/cases/${params.id}`, { cache: 'no-store' }).then((r) => r.json()).then(setData);
  useEffect(() => { void load(); }, [params.id]);
  const action = async (kind: 'assign'|'resolve'|'dismiss') => { await fetch(`/api/admin/fraud/cases/${params.id}/${kind}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(kind==='assign'?{ assigned_to_user_id:'admin' }:{ notes }) }); await load(); };
  if (!data) return <main className="p-6">Loading...</main>;
  return <main className="mx-auto max-w-5xl p-6 space-y-4"><h1 className="text-2xl font-bold">Fraud Case {params.id}</h1><p>{data.fraud_case?.summary}</p><div className="flex gap-2"><input className="bg-slate-900 p-2" value={notes} onChange={(e)=>setNotes(e.target.value)} /><button className="rounded bg-slate-800 px-3 py-2" onClick={()=>action('assign')}>Assign</button><button className="rounded bg-emerald-700 px-3 py-2" onClick={()=>action('resolve')}>Resolve</button><button className="rounded bg-rose-700 px-3 py-2" onClick={()=>action('dismiss')}>Dismiss</button></div><pre className="text-xs">{JSON.stringify(data.signals, null, 2)}</pre></main>;
}
