'use client';
import { useEffect, useState } from 'react';

export default function BonusesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<any[]>([]);
  const [reason, setReason] = useState('Manual revoke');
  const load = () => fetch(`/api/admin/bonuses?year=${year}&month=${month}`, { cache: 'no-store' }).then((r) => r.json()).then(setRows);
  useEffect(() => { void load(); }, [year, month]);
  const revoke = async (id: string) => { await fetch(`/api/admin/bonuses/${id}/revoke`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ reason }) }); await load(); };
  return <main className="mx-auto max-w-6xl p-6 space-y-4"><h1 className="text-2xl font-bold">Bonuses</h1><div className="flex gap-2"><input className="bg-slate-900 p-2" value={year} onChange={(e)=>setYear(Number(e.target.value))}/><input className="bg-slate-900 p-2" value={month} onChange={(e)=>setMonth(Number(e.target.value))}/><input className="bg-slate-900 p-2" value={reason} onChange={(e)=>setReason(e.target.value)}/></div><table className="w-full text-sm"><thead><tr><th>driver</th><th>discount_bps</th><th>status</th><th>valid</th><th></th></tr></thead><tbody>{rows.map((r)=><tr key={r.id}><td>{r.driver_user_id}</td><td>{r.discount_bps}</td><td>{r.status}</td><td>{new Date(r.starts_at).toLocaleDateString()} - {new Date(r.ends_at).toLocaleDateString()}</td><td><button className="rounded bg-rose-800 px-2 py-1" onClick={()=>revoke(r.id)}>Revoke</button></td></tr>)}</tbody></table></main>;
}
