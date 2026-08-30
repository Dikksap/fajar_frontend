import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function LoginPage() {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Format email tidak valid.");
      return;
    }

    setLoading(true);
    try {
      const user = await login(email, password);

      // remember flag sebenarnya ditangani via token expiry server (JWT_EXPIRES_IN)
      // jika remember false, bisa simpan di sessionStorage — untuk sekarang tetap localStorage
      void remember;

      // middleware role: hanya admin boleh ke /admin
      if (user.role !== "admin") {
        logout();
        setError("Akses ditolak: akun ini bukan admin (role=user). Hubungi administrator untuk upgrade ke admin.");
        return;
      }

      const target = location.state?.from ?? "/admin";
      // pastikan target di dalam /admin jika datang dari protected admin
      const safeTarget = target.startsWith("/admin") ? target : "/admin";
      navigate(safeTarget, { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login gagal";
      // mapping 401 Invalid credentials
      if (msg.toLowerCase().includes("invalid credentials") || msg.includes("401")) {
        setError("Email atau kata sandi salah.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-[56px] flex items-center justify-between px-6 lg:px-8 bg-surface-container-lowest border-b border-outline-variant/40 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M3 7L12 2L21 7V17L12 22L3 17V7Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M3 7L12 12L21 7" stroke="white" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M12 12V22" stroke="white" strokeWidth="1.4" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[13px] font-semibold tracking-[0.14em] text-primary leading-none">LUXE</span>
            <span className="text-[11px] font-medium tracking-[0.08em] text-on-surface-variant leading-none">INVENTORY</span>
          </div>
          <span className="hidden sm:inline-flex ml-3 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-semibold tracking-wide">
            PREMIUM ELECTRONICS
          </span>
        </div>
        <div className="hidden md:flex items-center gap-2 text-xs text-on-surface-variant">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          System operational
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-[1280px] grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-6 items-center">
          <div className="hidden lg:flex flex-col justify-center px-8 xl:px-12 py-10">
            <div className="inline-flex items-center gap-2 mb-8">
              <span className="h-px w-8 bg-primary" />
              <span className="text-xs font-semibold tracking-[0.14em] text-primary">CORPORATE MODERN — MINIMALIST</span>
            </div>
            <h1 className="font-inter text-[42px] xl:text-[48px] font-bold leading-[0.95] tracking-[-0.02em] text-on-surface">
              Kelola inventaris
              <span className="block text-primary">premium dengan</span>
              <span className="block text-on-surface">presisi mutlak.</span>
            </h1>
            <p className="mt-5 text-[18px] leading-7 text-on-surface-variant max-w-[520px]">
              Platform high-end untuk elektronik premium. Stok, harga, dan pergerakan barang dalam satu tampilan yang bersih dan terpercaya.
            </p>
            <div className="mt-10 grid grid-cols-3 gap-4 max-w-[520px]">
              {[
                { k: "99.9%", label: "Uptime SLA", sub: "Infrastruktur stabil" },
                { k: "< 50ms", label: "Realtime sync", sub: "Update stok instan" },
                { k: "2.4k+", label: "SKU terkelola", sub: "Katalog premium" },
              ].map((s) => (
                <div key={s.k} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 shadow-soft">
                  <div className="text-[20px] font-semibold tracking-tight text-primary">{s.k}</div>
                  <div className="text-xs font-semibold text-on-surface mt-1">{s.label}</div>
                  <div className="text-[11px] text-on-surface-variant leading-tight">{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-[480px] mx-auto lg:mx-0 lg:ml-auto">
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-soft overflow-hidden">
              <div className="h-1 w-full bg-primary" />
              <div className="p-7 sm:p-8">
                <div className="lg:hidden mb-6">
                  <h1 className="text-2xl font-semibold tracking-tight text-on-surface leading-none">Masuk ke Luxe</h1>
                  <p className="text-sm text-on-surface-variant mt-2">Khusus administrator.</p>
                </div>
                <div className="hidden lg:block mb-7">
                  <h2 className="text-[24px] font-semibold tracking-[-0.01em] text-on-surface leading-none">Selamat datang kembali</h2>
                  <p className="text-sm text-on-surface-variant mt-2 leading-5">Masuk sebagai <span className="font-semibold text-primary">admin</span> untuk ke dashboard.</p>
                </div>

                {error && (
                  <div className="mb-5 flex gap-3 items-start bg-error-container border border-error/15 rounded-lg px-3.5 py-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 text-error" aria-hidden>
                      <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    </svg>
                    <p className="text-sm leading-5 text-on-error-container font-medium">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-sm font-medium text-on-surface">Email admin</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M4 6.5C4 5.67 4.67 5 5.5 5H18.5C19.33 5 20 5.67 20 6.5V17.5C20 18.33 19.33 19 18.5 19H5.5C4.67 19 4 18.33 4 17.5V6.5Z" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M4.5 6L12 12.5L19.5 6" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="admin@perusahaan.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="input-focus w-full h-[44px] pl-10 pr-4 bg-surface-container-lowest border border-outline-variant rounded-sm text-sm text-on-surface placeholder:text-on-surface-variant/60 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="text-sm font-medium text-on-surface">Kata sandi</label>
                      <a href="#" onClick={(e) => e.preventDefault()} className="text-xs font-medium text-primary hover:text-primary-container transition">Lupa kata sandi?</a>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                          <path d="M7 10V7.5C7 4.46 9.46 2 12.5 2C15.54 2 18 4.46 18 7.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                          <rect x="4" y="10" width="17" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.4" />
                          <circle cx="12.5" cy="15.5" r="1.8" fill="currentColor" />
                        </svg>
                      </span>
                      <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="input-focus w-full h-[44px] pl-10 pr-11 bg-surface-container-lowest border border-outline-variant rounded-sm text-sm text-on-surface placeholder:text-on-surface-variant/60 transition"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? "Sembunyikan" : "Tampilkan"}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 w-8 h-8 grid place-items-center rounded-sm text-outline hover:text-on-surface-variant hover:bg-surface-container transition"
                      >
                        {showPassword ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 3L21 21M10.5 10.5L12 12M9.5 9.5C7.5 11.1 6.2 12.5 4 14C5.8 17.2 8.5 19 12 19C13.8 19 15.3 18.5 16.6 17.6M14.8 14.8C14.2 15.4 13.2 15.8 12 15.8C9.8 15.8 8 14 8 11.8C8 10.6 8.4 9.6 9 8.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M2 12C3.8 8.2 6.9 5.5 12 5.5C17.1 5.5 20.2 8.2 22 12C20.2 15.8 17.1 18.5 12 18.5C6.9 18.5 3.8 15.8 2 12Z" stroke="currentColor" strokeWidth="1.4" /><circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.4" /></svg>
                        )}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-[44px] rounded-sm bg-primary text-on-primary text-sm font-semibold tracking-wide hover:bg-primary-container active:bg-[#003a2a] transition flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk ke Dashboard
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M5 12H19M19 12L12.5 5.5M19 12L12.5 18.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </>
                    )}
                  </button>

                  <div className="rounded-lg bg-surface-container border border-outline-variant/30 px-3.5 py-3 flex gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                    <p className="text-xs leading-5 text-on-surface-variant">
                      Endpoint: <code className="px-1.5 py-0.5 rounded bg-surface-container-high text-[11px] font-mono text-on-surface">POST /auth/login</code> — hanya role <span className="font-semibold text-primary">admin</span> yang bisa lanjut ke <code className="px-1 py-0.5 rounded bg-surface-container-high text-[11px] font-mono">/admin</code>.
                    </p>
                  </div>
                </form>
              </div>
              <div className="bg-surface-container-low border-t border-outline-variant/30 px-7 sm:px-8 py-3 flex items-center justify-between">
                <span className="text-[11px] font-medium tracking-wide text-on-surface-variant flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary-container border border-secondary/20" />
                  API {import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000"}
                </span>
                <span className="text-[11px] text-outline">JWT • Bearer</span>
              </div>
            </div>
            <p className="text-center text-xs text-on-surface-variant mt-4 px-4">
              Non-admin akan diarahkan ke 403. Token disimpan di <code className="font-mono">localStorage.access_token</code>.
            </p>
          </div>
        </div>
      </main>

      <footer className="border-t border-outline-variant/30 bg-surface-container-lowest">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-8 h-12 flex items-center justify-between text-xs text-on-surface-variant">
          <span>© 2026 Luxe Inventory — Premium Electronics Management</span>
          <span className="hidden sm:inline">Swagger: http://localhost:3000/api</span>
        </div>
      </footer>
    </div>
  );
}
