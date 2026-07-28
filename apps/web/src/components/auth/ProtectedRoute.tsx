import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import type { AuthUser } from '../types/auth';

interface ProtectedRouteProps {
  minRole?: AuthUser['role'];
}

export default function ProtectedRoute({ minRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasMinimumRole } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <p className="text-sm">Loading session...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (minRole && !hasMinimumRole(minRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
