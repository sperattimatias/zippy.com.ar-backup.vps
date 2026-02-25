'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error('unauthorized');
        const data = await res.json();
        const roles: string[] = data.roles ?? [];
        if (!roles.includes('admin') && !roles.includes('sos')) throw new Error('forbidden');
        setAllowed(true);
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return <p className="p-6">Checking session...</p>;
  if (!allowed) return null;
  return <>{children}</>;
}
