'use client';
import { useState } from 'react';

export default function FraudConfigPage() {
  const [json, setJson] = useState(JSON.stringify({ repeated_pair_24h: 4, repeated_pair_7d: 12, passenger_trips_per_hour: 6, passenger_payments_per_hour: 4, driver_trips_per_hour: 8, shared_ip_users_24h: 6, shared_device_users_24h: 3, low_distance_km: 1.0 }, null, 2));
  const [out, setOut] = useState('');
  const save = async () => {
    const res = await fetch('/api/admin/config/fraud_thresholds', { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value_json: JSON.parse(json) }) });
    setOut(JSON.stringify(await res.json()));
  };
  return <main className="mx-auto max-w-4xl p-6 space-y-4"><h1 className="text-2xl font-bold">Fraud Config</h1><textarea className="h-80 w-full bg-slate-900 p-3 text-xs font-mono" value={json} onChange={(e)=>setJson(e.target.value)} /><button className="rounded bg-cyan-700 px-3 py-2" onClick={save}>Save thresholds</button><pre className="text-xs">{out}</pre></main>;
}
