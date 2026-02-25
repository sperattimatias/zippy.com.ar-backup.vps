'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(payload.message ?? 'Login failed');
      return;
    }

    router.push('/admin/dashboard');
    router.refresh();
  }

  return (
    <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl" onSubmit={onSubmit}>
      <h2 className="text-xl font-semibold">Login</h2>
      <input className="w-full rounded-md bg-slate-800 p-2" placeholder="email@company.com" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input className="w-full rounded-md bg-slate-800 p-2" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      <button className="w-full rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950" type="submit">Sign in</button>
    </form>
  );
}
