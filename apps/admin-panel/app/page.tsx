import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl items-center justify-center p-6">
      <section className="space-y-4 text-center">
        <p className="text-cyan-400">Zippy Rideshare Admin</p>
        <h1 className="text-4xl font-bold">Operations cockpit</h1>
        <p className="text-slate-300">Auth Sprint 1 enabled: centralized auth + RBAC guards.</p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950">
            Go to login
          </Link>
          <Link href="/admin/dashboard" className="rounded-md border border-slate-700 px-4 py-2">
            Admin dashboard
          </Link>
        <Link href="/admin/drivers" className="rounded-md border border-slate-700 px-4 py-2">Driver reviews</Link>
        </div>
      </section>
    </main>
  );
}
