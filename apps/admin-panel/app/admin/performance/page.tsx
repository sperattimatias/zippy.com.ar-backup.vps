'use client';
import { useEffect, useState } from 'react';

export default function PerformancePage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetch(`/api/admin/monthly-performance?year=${year}&month=${month}`, { cache: 'no-store' }).then((r) => r.json()).then(setRows); }, [year, month]);
  return <main className="mx-auto max-w-6xl p-6 space-y-4"><h1 className="text-2xl font-bold">Monthly Performance</h1><div className="flex gap-2"><input className="bg-slate-900 p-2" value={year} onChange={(e)=>setYear(Number(e.target.value))}/><input className="bg-slate-900 p-2" value={month} onChange={(e)=>setMonth(Number(e.target.value))}/></div><table className="w-full text-sm"><thead><tr><th>user</th><th>actor</th><th>index</th><th>completed</th><th>cancel_rate</th></tr></thead><tbody>{rows.map((r)=><tr key={r.id}><td>{r.user_id}</td><td>{r.actor_type}</td><td>{r.performance_index?.toFixed?.(3) ?? r.performance_index}</td><td>{r.trips_completed}</td><td>{r.cancel_rate}</td></tr>)}</tbody></table></main>;
}
