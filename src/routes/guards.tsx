import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

/**
 * Middleware: require authenticated user
 * Jika belum login → /login dengan state.from
 */
export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <div className="flex items-center gap-3 text-sm text-on-surface-variant">
          <span className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
          Memuat sesi...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  return <Outlet />;
}

/**
 * Middleware: khusus role admin
 * Harus sudah auth + role === "admin"
 * Jika bukan admin → /unauthorized (403) atau /login jika belum auth
 */
export function AdminGuard() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const loc = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-surface">
        <div className="flex items-center gap-3 text-sm text-on-surface-variant">
          <span className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
          Memuat sesi...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  }
  if (!isAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }
  return <Outlet />;
}

/**
 * Guest-only: kalau sudah login admin → langsung /admin
 * Dipakai di /login agar tidak bisa kembali ke login saat sudah auth
 */
export function GuestRoute() {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;
  if (isAuthenticated) return <Navigate to="/unauthorized" replace />;
  return <Outlet />;
}
