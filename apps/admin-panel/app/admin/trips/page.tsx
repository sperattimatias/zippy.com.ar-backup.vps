'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Trip = { id: string; status: string; passenger_user_id: string; driver_user_id?: string | null; price_base: number; price_final?: number | null; created_at: string };

export default function AdminTripsPage() {
  const [rows, setRows] = useState<Trip[]>([]);
  useEffect(() => { fetch('/api/admin/trips', { cache: 'no-store' }).then(r => r.json()).then(setRows); }, []);

  return (
    <main className="mx-auto max-w-6xl p-6">
      <h1 className="mb-4 text-3xl font-bold">Trips recientes</h1>
      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900"><tr><th className="p-3">ID</th><th>Status</th><th>Passenger</th><th>Driver</th><th>Base</th><th>Final</th><th>Created</th><th></th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-t border-slate-800">
                <td className="p-3">{t.id}</td><td>{t.status}</td><td>{t.passenger_user_id}</td><td>{t.driver_user_id ?? '-'}</td><td>{t.price_base}</td><td>{t.price_final ?? '-'}</td><td>{new Date(t.created_at).toLocaleString()}</td>
                <td><Link className="text-cyan-400" href={`/admin/trips/${t.id}`}>Ver</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
