import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function UnauthorizedPage() {
  const { isAuthenticated, user, logout } = useAuth();
  return (
    <div className="min-h-screen bg-surface grid place-items-center p-6">
      <div className="max-w-[520px] w-full bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-soft p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-error-container grid place-items-center mx-auto text-error">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M12 8V12M12 16H12.01M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
        </div>
        <h1 className="mt-4 text-xl font-semibold text-on-surface">403 — Akses Ditolak</h1>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">
          Halaman <code className="px-1 py-0.5 rounded bg-surface-container text-xs font-mono">/admin</code> khusus role <b>admin</b>.
          {isAuthenticated ? <> Akun kamu <b>{user?.email}</b> role <b>{user?.role}</b> tidak punya akses.</> : " Kamu belum login."}
        </p>
        <div className="mt-6 flex gap-3 justify-center">
          {!isAuthenticated ? (
            <Link to="/login" className="h-9 px-4 rounded-sm bg-primary text-on-primary text-sm font-medium grid place-items-center">Ke Login</Link>
          ) : (
            <>
              <button onClick={logout} className="h-9 px-4 rounded-sm border border-outline-variant text-on-surface text-sm font-medium">Logout</button>
              <Link to="/login" className="h-9 px-4 rounded-sm bg-primary text-on-primary text-sm font-medium grid place-items-center">Ganti akun admin</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
