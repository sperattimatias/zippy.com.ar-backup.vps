'use client';
import { useState } from 'react';

const templates: Record<string, string> = {
  default_commission_bps: '1000',
  level_rules: JSON.stringify({ driver: {}, passenger: {} }, null, 2),
  bonus_rules: JSON.stringify({ top_10_discount_bps: 300, top_3_discount_bps: 500, top_1_discount_bps: 800, commission_floor_bps: 200 }, null, 2),
};

export default function PoliciesPage() {
  const [key, setKey] = useState('default_commission_bps');
  const [json, setJson] = useState(templates.default_commission_bps);
  const [result, setResult] = useState('');

  const save = async () => {
    const parsed = JSON.parse(json);
    const res = await fetch(`/api/admin/policies/${key}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ value_json: parsed }) });
    setResult(JSON.stringify(await res.json()));
  };

  return <main className="mx-auto max-w-4xl p-6 space-y-4"><h1 className="text-2xl font-bold">Policies</h1><p className="text-amber-400">Warning: changes impact production behavior immediately.</p><select className="bg-slate-900 p-2" value={key} onChange={(e)=>{ setKey(e.target.value); setJson(templates[e.target.value]);}}>{Object.keys(templates).map((k)=><option key={k} value={k}>{k}</option>)}</select><textarea className="h-72 w-full bg-slate-900 p-3 font-mono text-xs" value={json} onChange={(e)=>setJson(e.target.value)} /><button className="rounded bg-cyan-700 px-3 py-2" onClick={save}>Save</button><pre className="text-xs">{result}</pre></main>;
}
