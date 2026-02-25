'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function FraudCasesPage() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { fetch('/api/admin/fraud/cases', { cache: 'no-store' }).then((r) => r.json()).then(setRows); }, []);
  return <main className="mx-auto max-w-6xl p-6 space-y-4"><h1 className="text-2xl font-bold">Fraud Cases</h1><table className="w-full text-sm"><thead><tr><th>status</th><th>severity</th><th>title</th><th>created</th><th></th></tr></thead><tbody>{rows.map((r)=><tr key={r.id}><td>{r.status}</td><td>{r.severity}</td><td>{r.title}</td><td>{new Date(r.created_at).toLocaleString()}</td><td><Link className="text-cyan-400" href={`/admin/fraud/cases/${r.id}`}>Open</Link></td></tr>)}</tbody></table></main>;
}
