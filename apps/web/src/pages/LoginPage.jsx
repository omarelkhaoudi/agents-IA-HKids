import { Link } from 'react-router-dom';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl shadow-slate-950/40 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="hidden bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 p-10 lg:flex lg:flex-col lg:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-50/80">
              H-Kids Platform
            </p>
            <h1 className="mt-6 max-w-md text-4xl font-semibold leading-tight text-white">
              Administrative AI Assistant foundation for scalable operations.
            </h1>
          </div>
          <p className="max-w-md text-sm leading-6 text-cyan-50/90">
            Clean architecture first: secure entry point, modular frontend, and backend ready for
            future AI and PostgreSQL integration.
          </p>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mx-auto max-w-md">
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-cyan-300">
              Sign In
            </p>
            <h2 className="mt-4 text-3xl font-semibold text-white">Welcome back</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              This screen is intentionally UI-only. Authentication logic is not implemented in this
              foundation phase.
            </p>

            <form className="mt-10 space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
                <input
                  type="email"
                  placeholder="admin@hkids.app"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-400"
                />
              </label>

              <Link
                to="/dashboard"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Enter platform
              </Link>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
