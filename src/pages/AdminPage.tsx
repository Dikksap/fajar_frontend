import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [usersCount, setUsersCount] = useState<number | null>(null);

  useEffect(() => {
    // contoh hit endpoint terproteksi GET /users (butuh Bearer)
    apiFetch<unknown[]>("/users")
      .then((data) => setUsersCount(Array.isArray(data) ? data.length : null))
      .catch(() => setUsersCount(null));
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Admin header - /admin sebagai root */}
      <header className="h-[56px] flex items-center justify-between px-6 lg:px-8 bg-primary border-b border-primary-container sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-white/15 border border-white/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 7L12 2L21 7V17L12 22L3 17V7Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.14em] text-white leading-none">LUXE ADMIN</span>
            <span className="text-[10px] font-medium tracking-[0.08em] text-white/70 leading-none">/admin • ROOT</span>
          </div>
          <span className="hidden sm:inline-flex ml-3 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold">ADMIN ONLY</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-sm font-medium text-white leading-none">{user?.name}</span>
            <span className="text-xs text-white/70">{user?.email} • {user?.role}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white text-primary grid place-items-center text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
          </div>
          <button
            onClick={handleLogout}
            className="h-8 px-3.5 rounded-sm bg-white text-primary text-xs font-semibold hover:bg-surface-container-lowest transition flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M16 17L21 12L16 7M21 12H9M13 21H6C4.9 21 4 20.1 4 19V5C4 3.9 4.9 3 6 3H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-[260px] bg-surface-container-lowest border-r border-outline-variant/30 flex-col">
          <nav className="p-4 space-y-1">
            <p className="px-3 py-2 text-[11px] font-semibold tracking-[0.1em] text-outline">NAVIGASI ADMIN</p>
            <a className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-medium">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
              Dashboard
            </a>
            <a href="#" onClick={e=>e.preventDefault()} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm">Inventaris</a>
            <a href="#" onClick={e=>e.preventDefault()} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm">Pengguna {usersCount !== null && <span className="ml-auto bg-secondary-container text-on-secondary-container text-xs px-1.5 py-0.5 rounded-full">{usersCount}</span>}</a>
            <a href="#" onClick={e=>e.preventDefault()} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-on-surface-variant hover:bg-surface-container text-sm">Laporan</a>
          </nav>
          <div className="mt-auto p-4 border-t border-outline-variant/30">
            <div className="rounded-lg bg-surface-container border border-outline-variant/30 p-3">
              <p className="text-xs font-semibold text-on-surface">Middleware aktif</p>
              <p className="text-xs text-on-surface-variant leading-4 mt-1"><code className="font-mono text-[11px]">AdminGuard</code> — hanya role <b>admin</b> bisa akses <code className="font-mono text-[11px]">/admin/*</code></p>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-[960px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-[28px] font-semibold tracking-tight text-on-surface">Dashboard Admin</h1>
                <p className="text-sm text-on-surface-variant mt-1">Selamat datang, <span className="font-medium text-on-surface">{user?.name}</span>. Ini root <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/admin</code> — terproteksi middleware role.</p>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed text-xs font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" /> Auth: Bearer JWT
              </span>
            </div>

            <div className="mt-6 grid sm:grid-cols-3 gap-4">
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-soft">
                <p className="text-xs font-medium text-on-surface-variant">Status Sesi</p>
                <p className="text-lg font-semibold text-primary mt-1">Authenticated</p>
                <p className="text-xs text-on-surface-variant mt-1 font-mono truncate">{user?.email}</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-soft">
                <p className="text-xs font-medium text-on-surface-variant">Role</p>
                <p className="text-lg font-semibold text-on-surface mt-1 uppercase tracking-wide">{user?.role}</p>
                <p className="text-xs text-on-surface-variant mt-1">Guard: @Roles('admin')</p>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 shadow-soft">
                <p className="text-xs font-medium text-on-surface-variant">Total Users (GET /users)</p>
                <p className="text-lg font-semibold text-on-surface mt-1">{usersCount ?? "—"}</p>
                <p className="text-xs text-on-surface-variant mt-1">Butuh header Authorization</p>
              </div>
            </div>

            <div className="mt-6 bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 shadow-soft">
              <h2 className="text-sm font-semibold text-on-surface">Cara pakai token</h2>
              <pre className="mt-3 p-3 rounded-lg bg-inverse-surface text-inverse-on-surface text-xs leading-5 overflow-auto font-mono">
{`// semua request terproteksi
fetch('http://localhost:3000/users', {
  headers: { Authorization: \`Bearer \${localStorage.getItem('access_token')}\` }
});

// logout (stateless)
localStorage.removeItem('access_token');
localStorage.removeItem('auth_user');
location.href = '/login';`}
              </pre>
              <button onClick={handleLogout} className="mt-4 h-9 px-4 rounded-sm bg-error text-on-error text-sm font-medium hover:bg-[#a81818] transition">Hapus sesi & kembali ke login</button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
