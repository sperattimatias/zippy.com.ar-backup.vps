import { LoginForm } from '../../components/auth/login-form';

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6">
      <section className="w-full max-w-md space-y-4">
        <h1 className="text-3xl font-bold">Zippy Admin Login</h1>
        <p className="text-slate-300">Use your admin/sos account credentials.</p>
        <LoginForm />
      </section>
    </main>
  );
}
