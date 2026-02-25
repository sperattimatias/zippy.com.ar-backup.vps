export function LoginPlaceholder() {
  return (
    <form className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl">
      <h2 className="text-xl font-semibold">Login (placeholder)</h2>
      <input className="w-full rounded-md bg-slate-800 p-2" placeholder="email@company.com" />
      <input className="w-full rounded-md bg-slate-800 p-2" placeholder="••••••••" type="password" />
      <button className="w-full rounded-md bg-cyan-500 px-4 py-2 font-semibold text-slate-950" type="button">
        Sign in
      </button>
      <p className="text-sm text-slate-400">Prepared for OAuth/JWT integration in upcoming sprint.</p>
    </form>
  );
}
