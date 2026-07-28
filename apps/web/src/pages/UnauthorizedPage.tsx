import { Link } from 'react-router-dom';

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6">
      <div className="max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-10 text-center shadow-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.3em] text-amber-300">Access denied</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Unauthorized</h1>
        <p className="mt-4 text-sm leading-6 text-slate-400">
          Your account does not have permission to access this section of the H-Kids AI platform.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Back to dashboard
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
          >
            Switch account
          </Link>
        </div>
      </div>
    </div>
  );
}
