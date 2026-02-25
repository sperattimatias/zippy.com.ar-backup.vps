'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type MePayload = { email: string; roles: string[] };

export default function DashboardPage() {
  const [me, setMe] = useState<MePayload | null>(null);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => setMe({ email: data.email, roles: data.roles ?? [] }));
  }, []);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-slate-300">Logged in as {me?.email ?? '...'} roles: {(me?.roles ?? []).join(', ')}</p>
      <div className="flex gap-4 text-cyan-400">
        <Link href="/admin/trips">Trips</Link>
        <Link href="/admin/geozones">GeoZones</Link>
        <Link href="/admin/safety-alerts">Safety Alerts</Link>
        <Link href="/admin/scores">Scores</Link>
        <Link href="/admin/merit/config">Merit Config</Link>
        <Link href="/admin/premium-zones">Premium Zones</Link>
        <Link href="/admin/levels">Levels</Link>
        <Link href="/admin/performance">Performance</Link>
        <Link href="/admin/bonuses">Bonuses</Link>
        <Link href="/admin/policies">Policies</Link>
        <Link href="/admin/fraud/cases">Fraud Cases</Link>
        <Link href="/admin/fraud/config">Fraud Config</Link>
      </div>

    </main>
  );
}
