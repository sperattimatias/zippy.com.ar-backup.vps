'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Row = { id: string; user_id: string; status: string; docs_count: number; created_at: string };

export default function DriversPage() {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    fetch('/api/admin/drivers/pending', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setRows);
  }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Driver Reviews</h1>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900"><tr><th className="p-3">user_id</th><th>Status</th><th>Docs</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-800">
                <td className="p-3">{r.user_id}</td>
                <td>{r.status}</td>
                <td>{r.docs_count}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td><Link className="text-cyan-400" href={`/admin/drivers/${r.id}`}>Revisar</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
