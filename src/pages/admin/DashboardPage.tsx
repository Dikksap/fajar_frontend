import { useEffect, useState, useRef, useMemo } from "react";
import { useAuth } from "../../auth/useAuth";
import {
  getDashboard,
  getDashboardPenjualanBulanan,
  getDashboardPembelianBulanan,
  getDashboardProfitBulanan,
  type DashboardSummary,
  type DashboardPenjualanBulanan,
  type DashboardPembelianBulanan,
  type DashboardProfitBulanan,
  type DashboardBulananQuery,
} from "../../lib/dashboard";

function fmtIDR(v: string | number | null | undefined) {
  if (v === null || v === undefined || v === "") return "Rp 0";
  const n = typeof v === "string" ? Number(v) : v;
  if (Number.isNaN(n)) return String(v);
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
function fmtNum(n: number | string | null | undefined) {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("id-ID").format(Number(n));
}

// Chart: profit-bulanan → grouped bars (totalHargaJual, totalProfitKotor, profitBersih)
function ProfitChart({ data }: { data: DashboardProfitBulanan[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    if (data.length === 0) {
      ctx.fillStyle = "#6f7973";
      ctx.font = "14px Inter, sans-serif";
      ctx.textAlign = "center";
        ctx.fillText("Belum ada data.", rect.width / 2, rect.height / 2);
      return;
    }

    const labels = data.map((d) => d.periodeLabel);
    const hargaJual = data.map((d) => Number(d.totalHargaJual) || 0);
    const profitKotor = data.map((d) => Number(d.totalProfitKotor) || 0);
    const profitBersih = data.map((d) => Number(d.profitBersih) || 0);

    const colors = ["#065f46", "#94a3b8", "#fbbf24"]; // pendapatan, pengeluaran analogy → hargaJual, profitKotor, profitBersih
    const W = rect.width;
    const H = rect.height;
    const pad = { top: 24, right: 16, bottom: 32, left: 56 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;
    const maxVal = Math.max(1, ...hargaJual, ...profitKotor, ...profitBersih) * 1.15;

    // grid
    ctx.strokeStyle = "#e1e3e4";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(W - pad.right, y);
      ctx.stroke();
      const val = maxVal - (maxVal / 4) * i;
      ctx.fillStyle = "#6f7973";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "right";
      const label = val >= 1_000_000 ? `${(val / 1_000_000).toFixed(1)}jt` : val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(Math.round(val));
      ctx.fillText(label, pad.left - 8, y + 3);
    }

    const groupW = chartW / labels.length;
    const barW = Math.min(22, groupW * 0.2);
    const gap = 4;

    labels.forEach((label, i) => {
      const gx = pad.left + groupW * i + (groupW - (barW * 3 + gap * 2)) / 2;
      const datasets = [hargaJual[i], profitKotor[i], profitBersih[i]];
      datasets.forEach((val, j) => {
        const h = (val / maxVal) * chartH;
        const x = gx + j * (barW + gap);
        const y = pad.top + chartH - h;
        ctx.fillStyle = colors[j];
        const r = 4;
        ctx.beginPath();
        ctx.moveTo(x, y + r);
        ctx.arcTo(x, y, x + barW, y, r);
        ctx.arcTo(x + barW, y, x + barW, y + h, r);
        ctx.lineTo(x + barW, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.fill();
      });
      ctx.fillStyle = "#3f4944";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "center";
      // trim label to short month if dense
      const short = label.length > 7 ? label.slice(5) : label;
      ctx.fillText(short, pad.left + groupW * i + groupW / 2, H - 8);
    });
  }, [data]);

  return (
    <div className="w-full h-80 relative">
      <canvas ref={canvasRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sumLoading, setSumLoading] = useState(true);
  const [sumErr, setSumErr] = useState<string | null>(null);

  const [jual, setJual] = useState<DashboardPenjualanBulanan[]>([]);
  const [beli, setBeli] = useState<DashboardPembelianBulanan[]>([]);
  const [profit, setProfit] = useState<DashboardProfitBulanan[]>([]);
  const [bulanLoading, setBulanLoading] = useState(true);
  const [bulanErr, setBulanErr] = useState<string | null>(null);

  const [periodeMode, setPeriodeMode] = useState<"all" | "periode" | "bulanTahun" | "range">("all");
  const [periodeVal, setPeriodeVal] = useState(new Date().toISOString().slice(0, 7));
  const [bulanVal, setBulanVal] = useState("");
  const [tahunVal, setTahunVal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const buildQuery = useMemo((): DashboardBulananQuery | undefined => {
    if (periodeMode === "periode" && periodeVal) return { periode: periodeVal };
    if (periodeMode === "bulanTahun" && bulanVal && tahunVal) return { bulan: bulanVal, tahun: tahunVal, month: bulanVal, year: tahunVal } as DashboardBulananQuery;
    if (periodeMode === "range" && startDate && endDate) return { startDate, endDate };
    return undefined;
  }, [periodeMode, periodeVal, bulanVal, tahunVal, startDate, endDate]);

  const queryLabel = useMemo(() => {
    if (!buildQuery) return "";
    const sp = new URLSearchParams(buildQuery as Record<string, string>);
    return sp.toString() ? `?${sp.toString()}` : "";
  }, [buildQuery]);

  const fetchSummary = async () => {
    setSumLoading(true);
    setSumErr(null);
    try {
      const d = await getDashboard();
      setSummary(d);
    } catch (e) {
      setSumErr(e instanceof Error ? e.message : String(e));
    } finally {
      setSumLoading(false);
    }
  };

  const fetchBulanan = async () => {
    setBulanLoading(true);
    setBulanErr(null);
    const q = buildQuery;
    try {
      const [a, b, c] = await Promise.all([
        getDashboardPenjualanBulanan(q),
        getDashboardPembelianBulanan(q),
        getDashboardProfitBulanan(q),
      ]);
      setJual(Array.isArray(a) ? a : []);
      setBeli(Array.isArray(b) ? b : []);
      setProfit(Array.isArray(c) ? c : []);
    } catch (e) {
      setBulanErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBulanLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchBulanan();
  }, [periodeMode, periodeVal, bulanVal, tahunVal, startDate, endDate]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[32px] font-semibold tracking-tight text-on-surface leading-none">Dashboard</h1>
          <p className="text-sm md:text-base text-on-surface-variant mt-2">
            Ringkasan stok, pembelian, penjualan, dan laba. {user?.name && <span className="text-on-surface font-medium">{user.name}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { fetchSummary(); fetchBulanan(); }} className="bg-surface-container-lowest border border-outline-variant text-on-surface-variant text-sm font-medium py-2 px-4 rounded-sm hover:bg-surface-container-low transition flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* Summary — view_dashboard */}
      <div className="mb-4 bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4 ambient-shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-outline-variant/50">
          <h2 className="text-sm font-bold uppercase tracking-wide text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">dashboard</span> Ringkasan
          </h2>
          {sumLoading ? (
            <span className="text-xs text-on-surface-variant inline-flex items-center gap-1.5"><span className="w-3 h-3 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat…</span>
          ) : sumErr ? (
            <span className="text-xs text-error">{sumErr}</span>
          ) : null}
        </div>

        {sumErr && !sumLoading ? (
          <div className="py-6 text-center">
            <p className="text-sm text-error font-medium">{sumErr}</p>
            <button onClick={fetchSummary} className="mt-2 text-sm text-primary hover:underline">Coba lagi</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            {/* Stok */}
            <div className="bg-surface-bright rounded-xl border border-outline-variant/30 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Stok</span>
                <div className="bg-primary/10 p-2 rounded-full text-primary grid place-items-center"><span className="material-symbols-outlined text-[20px]">inventory_2</span></div>
              </div>
              <div className="text-[28px] font-bold leading-none tracking-tight text-on-surface">{summary ? fmtNum(summary.totalUnit) : sumLoading ? "…" : "—"} <span className="text-sm font-normal text-on-surface-variant">unit</span></div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-primary/10 rounded-lg py-2"><div className="text-[11px] uppercase tracking-wide text-on-surface-variant">Tersedia</div><div className="font-bold text-primary">{summary ? fmtNum(summary.stokTersedia) : "—"}</div></div>
                <div className="bg-surface-container rounded-lg py-2"><div className="text-[11px] uppercase tracking-wide text-on-surface-variant">Terjual</div><div className="font-bold">{summary ? fmtNum(summary.stokTerjual) : "—"}</div></div>
                <div className="bg-secondary-container/20 rounded-lg py-2"><div className="text-[11px] uppercase tracking-wide text-secondary">Retur</div><div className="font-bold text-secondary">{summary ? fmtNum(summary.stokRetur) : "—"}</div></div>
              </div>
            </div>

            {/* Pembelian */}
            <div className="bg-surface-bright rounded-xl border border-outline-variant/30 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Pembelian</span>
                <div className="bg-surface-container p-2 rounded-full text-on-surface-variant grid place-items-center"><span className="material-symbols-outlined text-[20px]">shopping_bag</span></div>
              </div>
              <div className="text-[22px] font-bold leading-none tracking-tight text-on-surface">{summary ? fmtIDR(summary.totalHargaBeli) : sumLoading ? "…" : "—"}</div>
              <div className="text-xs text-on-surface-variant mt-1">{summary ? `${fmtNum(summary.totalPembelian)} transaksi` : "—"}</div>
              <div className="mt-3 text-xs flex justify-between"><span className="text-on-surface-variant">Komisi</span><span className="font-mono font-semibold">{summary ? fmtIDR(summary.totalKomisiPembelian) : "—"}</span></div>
            </div>

            {/* Penjualan */}
            <div className="bg-surface-bright rounded-xl border border-outline-variant/30 p-4 flex flex-col justify-between">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">Penjualan</span>
                <div className="bg-primary/10 p-2 rounded-full text-primary grid place-items-center"><span className="material-symbols-outlined text-[20px]">point_of_sale</span></div>
              </div>
              <div className="text-[22px] font-bold leading-none tracking-tight text-on-surface">{summary ? fmtIDR(summary.totalHargaJual) : sumLoading ? "…" : "—"}</div>
              <div className="text-xs text-on-surface-variant mt-1">{summary ? `${fmtNum(summary.totalPenjualan)} transaksi` : "—"}</div>
              <div className="mt-3 text-xs flex justify-between"><span className="text-on-surface-variant">Komisi</span><span className="font-mono font-semibold">{summary ? fmtIDR(summary.totalKomisiPenjualan) : "—"}</span></div>
            </div>

            {/* Komisi & Profit Bersih */}
            <div className="bg-surface-bright rounded-xl border border-primary/20 p-4 flex flex-col justify-between ring-1 ring-primary/10">
              <div className="flex justify-between items-start mb-3">
                <span className="text-xs font-bold text-primary uppercase tracking-wider">Profit Bersih</span>
                <div className="bg-primary p-2 rounded-full text-on-primary grid place-items-center"><span className="material-symbols-outlined text-[20px]">payments</span></div>
              </div>
              <div className="text-[22px] font-bold leading-none tracking-tight text-primary">{summary ? fmtIDR(summary.profitBersihPenjualan) : sumLoading ? "…" : "—"}</div>
              <div className="text-xs text-on-surface-variant mt-1">Setelah komisi penjualan</div>
              <div className="mt-3 text-xs flex justify-between"><span className="text-on-surface-variant">Total komisi</span><span className="font-mono font-semibold">{summary ? fmtIDR(summary.totalKomisi) : "—"}</span></div>
            </div>
          </div>
        )}
      </div>

{/* Filter periode — satu filter untuk grafik dan 3 tabel bulanan */}
       <div className="mb-4 bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 ambient-shadow-sm">
         <div className="flex flex-col sm:flex-row gap-3 items-center sm:items-start">
           <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">calendar_month</span> Periode</span>
           <select value={periodeMode} onChange={(e) => setPeriodeMode(e.target.value as never)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm">
             <option value="all">Semua periode</option>
             <option value="periode">Periode</option>
             <option value="bulanTahun">Bulan & Tahun</option>
             <option value="range">Rentang Tanggal</option>
           </select>
           {periodeMode === "periode" && <input type="month" value={periodeVal} onChange={(e) => setPeriodeVal(e.target.value)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />}
           {periodeMode === "bulanTahun" && (
             <>
               <input type="number" min={1} max={12} placeholder="Bulan" value={bulanVal} onChange={(e) => setBulanVal(e.target.value)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
               <input type="number" min={2000} max={2100} placeholder="Tahun" value={tahunVal} onChange={(e) => setTahunVal(e.target.value)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
             </>
           )}
           {periodeMode === "range" && (
             <>
               <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
               <span className="text-on-surface-variant">—</span>
               <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full sm:w-auto h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
             </>
           )}
           {periodeMode !== "all" && <button onClick={() => { setPeriodeVal(new Date().toISOString().slice(0, 7)); setBulanVal(""); setTahunVal(""); setStartDate(""); setEndDate(""); setPeriodeMode("all"); }} className="w-full sm:w-auto h-9 px-3 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium">Reset</button>}
         </div>
         <p className="text-xs text-on-surface-variant mt-2">Filter ini berlaku untuk grafik dan tabel bulanan di bawah. Ringkasan di atas bersifat kumulatif all-time.</p>
       </div>

{/* Chart real dari profit-bulanan */}
       <div className="mb-4 bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-4 ambient-shadow-sm">
         <div className="flex justify-between items-center mb-4 pb-3 border-b border-outline-variant/50">
           <h2 className="text-lg font-semibold text-on-surface">Profit Bulanan</h2>
           <div className="hidden sm:flex items-center gap-3 text-xs">
             <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Harga Jual</span>
             <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#94a3b8] inline-block" /> Laba Kotor</span>
             <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#fbbf24] inline-block" /> Laba Bersih</span>
           </div>
         </div>
         {bulanLoading ? (
           <div className="h-[200px] sm:h-80 grid place-items-center text-sm text-on-surface-variant"><span className="inline-flex items-center gap-2"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat bulanan…</span></div>
         ) : bulanErr ? (
           <div className="h-[200px] sm:h-80 grid place-items-center"><div className="text-center"><p className="text-sm text-error font-medium">{bulanErr}</p><button onClick={fetchBulanan} className="mt-2 text-sm text-primary hover:underline">Coba lagi</button></div></div>
         ) : (
           <div className="h-[200px] sm:h-80">
             <ProfitChart data={profit} />
           </div>
         )}
         <p className="text-xs text-on-surface-variant mt-2">GET /dashboard/profit-bulanan{queryLabel} — {profit.length === 0 ? "belum ada data" : `${profit.length} periode`}</p>
       </div>

      {/* 3 tabel bulanan */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
        {/* Penjualan bulanan */}
        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 overflow-hidden ambient-shadow-sm">
          <div className="px-4 py-3 border-b border-outline-variant/50 flex justify-between items-center bg-surface-bright">
            <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary">point_of_sale</span> Penjualan Bulanan</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-surface-container border border-outline-variant/30">{jual.length} periode</span>
          </div>
<div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[500px]">
              <thead><tr className="bg-surface-bright border-b border-outline-variant/50 text-xs font-semibold uppercase text-on-surface-variant"><th className="py-2.5 px-3">Periode</th><th className="py-2.5 px-3 text-center">Transaksi</th><th className="py-2.5 px-3 text-right">Harga Jual</th><th className="py-2.5 px-3 text-right">Laba Kotor</th><th className="py-2.5 px-3 text-right">Komisi</th><th className="py-2.5 px-3 text-right">Laba Bersih</th></tr></thead>
              <tbody className="text-sm">
                {bulanLoading ? <tr><td colSpan={6} className="py-10 text-center text-on-surface-variant">Memuat…</td></tr>
                  : bulanErr ? <tr><td colSpan={6} className="py-10 text-center text-error">{bulanErr}</td></tr>
                    : jual.length === 0 ? <tr><td colSpan={6} className="py-10 text-center text-on-surface-variant">Belum ada data.</td></tr>
                      : jual.map((r) => (
                        <tr key={r.periodeLabel} className="border-b border-outline-variant/20 hover:bg-surface-container-low last:border-0">
                          <td className="py-2.5 px-3 font-mono text-xs"><span className="font-semibold text-on-surface">{r.periodeLabel}</span></td>
                          <td className="py-2.5 px-3 text-center font-medium">{fmtNum(r.totalTransaksi)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(r.totalHargaJual)}</td>
                          <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(r.totalProfitKotor)}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-secondary">{fmtIDR(r.totalKomisi)}</td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{fmtIDR(r.profitBersih)}</td>
                        </tr>
                      ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pembelian + Profit side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 overflow-hidden ambient-shadow-sm">
            <div className="px-4 py-3 border-b border-outline-variant/50 flex justify-between items-center bg-surface-bright">
<h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">shopping_bag</span> Pembelian Bulanan</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-surface-container border border-outline-variant/30">{beli.length} periode</span>
          </div>
<div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[400px]">
              <thead><tr className="bg-surface-bright border-b border-outline-variant/50 text-xs font-semibold uppercase text-on-surface-variant"><th className="py-2.5 px-3">Periode</th><th className="py-2.5 px-3 text-center">Transaksi</th><th className="py-2.5 px-3 text-right">Harga Beli</th><th className="py-2.5 px-3 text-right">Komisi</th></tr></thead>
              <tbody className="text-sm">
                {bulanLoading ? <tr><td colSpan={4} className="py-10 text-center text-on-surface-variant">Memuat…</td></tr>
                    : bulanErr ? <tr><td colSpan={4} className="py-10 text-center text-error">{bulanErr}</td></tr>
                      : beli.length === 0 ? <tr><td colSpan={4} className="py-10 text-center text-on-surface-variant">Belum ada data.</td></tr>
                        : beli.map((r) => (
                          <tr key={r.periodeLabel} className="border-b border-outline-variant/20 hover:bg-surface-container-low last:border-0">
                            <td className="py-2.5 px-3 font-mono text-xs font-semibold">{r.periodeLabel}</td>
                            <td className="py-2.5 px-3 text-center">{fmtNum(r.totalTransaksi)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(r.totalHargaBeli)}</td>
                            <td className="py-2.5 px-3 text-right font-mono text-secondary">{fmtIDR(r.totalKomisi)}</td>
                          </tr>
                        ))}
              </tbody>
            </table>
          </div>
        </div>

          <div className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 overflow-hidden ambient-shadow-sm">
            <div className="px-4 py-3 border-b border-outline-variant/50 flex justify-between items-center bg-surface-bright">
<h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2"><span className="material-symbols-outlined text-[18px] text-primary">trending_up</span> Profit Bulanan</h3>
            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary">{profit.length} periode</span>
          </div>
<div className="overflow-x-auto">
             <table className="w-full text-left border-collapse min-w-[450px]">
              <thead><tr className="bg-surface-bright border-b border-outline-variant/50 text-xs font-semibold uppercase text-on-surface-variant"><th className="py-2.5 px-3">Periode</th><th className="py-2.5 px-3 text-center">Penjualan</th><th className="py-2.5 px-3 text-right">Harga Jual</th><th className="py-2.5 px-3 text-right">Laba Kotor</th><th className="py-2.5 px-3 text-right">Laba Bersih</th></tr></thead>
              <tbody className="text-sm">
                  {bulanLoading ? <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">Memuat…</td></tr>
                    : bulanErr ? <tr><td colSpan={5} className="py-10 text-center text-error">{bulanErr}</td></tr>
                      : profit.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant">Belum ada data.</td></tr>
                        : profit.map((r) => (
                          <tr key={r.periodeLabel} className="border-b border-outline-variant/20 hover:bg-surface-container-low last:border-0">
                            <td className="py-2.5 px-3 font-mono text-xs font-semibold">{r.periodeLabel}</td>
                            <td className="py-2.5 px-3 text-center">{fmtNum(r.totalPenjualan)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(r.totalHargaJual)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{fmtIDR(r.totalProfitKotor)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-primary">{fmtIDR(r.profitBersih)}</td>
                          </tr>
                        ))}
              </tbody>
            </table>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
