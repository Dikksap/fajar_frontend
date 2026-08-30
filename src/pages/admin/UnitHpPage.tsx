import { useEffect, useState, useMemo } from "react";
import { getUnitHp, getUnitHpById, type UnitHp, type StatusStok } from "../../lib/unitHp";
import { getKatalogModel, type KatalogModel } from "../../lib/katalogModel";

function statusColor(s: StatusStok) {
  if (s === "Tersedia") return "bg-primary/10 text-primary border-primary/15";
  if (s === "Terjual") return "bg-surface-container text-on-surface-variant border-outline-variant";
  return "bg-secondary-container/20 text-secondary border-secondary/20";
}
function statusLabel(s: StatusStok) {
  return s === "Tersedia" ? "Ready" : s;
}
function statusIcon(s: StatusStok) {
  if (s === "Tersedia") return "check_circle";
  if (s === "Terjual") return "sell";
  return "autorenew";
}

const KAPASITAS_OPTS = ["64", 128, 256, 512].map(String);
const STATUS_OPTS: StatusStok[] = ["Tersedia", "Terjual", "Retur"];

export default function UnitHpPage() {
  const [data, setData] = useState<UnitHp[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusStok | "">("");
  const [filterModel, setFilterModel] = useState<number | "">("");
  const [filterKapasitas, setFilterKapasitas] = useState<string | "">("");
  const [filterWarna, setFilterWarna] = useState("");

  const [models, setModels] = useState<KatalogModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [detail, setDetail] = useState<UnitHp | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const units = await getUnitHp();
      setData(Array.isArray(units) ? units : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const fetchModels = async () => {
    setModelsLoading(true);
    try {
      const list = await getKatalogModel();
      setModels(Array.isArray(list) ? list : []);
    } catch {
      // fallback
    } finally {
      setModelsLoading(false);
    }
  };

  useEffect(() => { fetchAll(); fetchModels(); }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = useMemo(() => data.filter((u) => {
    if (filterStatus && u.statusStok !== filterStatus) return false;
    if (filterModel && u.idModel !== filterModel) return false;
    if (filterKapasitas && String(u.kapasitasGb) !== filterKapasitas) return false;
    if (filterWarna.trim() && !u.warna?.toLowerCase().includes(filterWarna.trim().toLowerCase())) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      u.imei5.toLowerCase().includes(s) ||
      (u.model?.namaModel.toLowerCase().includes(s) ?? false) ||
      (u.warna?.toLowerCase().includes(s) ?? false) ||
      String(u.idModel).includes(s)
    );
  }), [data, q, filterStatus, filterModel, filterKapasitas, filterWarna]);

  const summary = useMemo(() => ({
    tersedia: data.filter(u => u.statusStok === "Tersedia").length,
    terjual: data.filter(u => u.statusStok === "Terjual").length,
    retur: data.filter(u => u.statusStok === "Retur").length,
    total: data.length,
  }), [data]);

  const hasActiveFilter = filterStatus || filterModel || filterKapasitas || filterWarna || q.trim();

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight text-on-surface leading-none">Daftar Barang</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Daftar unit HP (read-only) • status otomatis <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">Ready</span> saat pembelian • kelola barang via <a href="/admin/pembelian" className="text-primary underline">Pembelian</a>. {data.length} unit
          </p>
        </div>
        <a href="/admin/pembelian" className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm self-start md:self-auto">
          <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span> Ke Pembelian
        </a>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>{toast.msg}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 ambient-shadow-sm relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Tersedia</p>
              <p className="text-2xl font-bold text-primary mt-1">{summary.tersedia}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center text-primary">
              <span className="material-symbols-outlined text-[20px]">inventory_2</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 ambient-shadow-sm relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-error" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Terjual</p>
              <p className="text-2xl font-bold text-error mt-1">{summary.terjual}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-error/10 grid place-items-center text-error">
              <span className="material-symbols-outlined text-[20px]">sell</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-4 ambient-shadow-sm relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-secondary" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Retur</p>
              <p className="text-2xl font-bold text-secondary mt-1">{summary.retur}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-secondary/10 grid place-items-center text-secondary">
              <span className="material-symbols-outlined text-[20px]">autorenew</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest border-2 border-primary/20 rounded-xl p-4 ambient-shadow-sm relative overflow-hidden">
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Total Unit</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{summary.total}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary">
              <span className="material-symbols-outlined text-[20px]">smartphone</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden ambient-shadow-sm mb-4">
        <div className="p-4 border-b border-outline-variant/30 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari IMEI, model, warna..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as never)} className="h-10 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" aria-label="Filter status">
              <option value="">Semua status</option>
              {STATUS_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={filterModel} onChange={(e) => setFilterModel(e.target.value === "" ? "" : Number(e.target.value))} className="h-10 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" disabled={modelsLoading} aria-label="Filter model">
              <option value="">Semua model</option>
              {models.map((m) => <option key={m.idModel} value={m.idModel}>{m.namaModel}</option>)}
            </select>
            <select value={filterKapasitas} onChange={(e) => setFilterKapasitas(e.target.value)} className="h-10 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" aria-label="Filter kapasitas">
              <option value="">Semua kapasitas</option>
              {KAPASITAS_OPTS.map((k) => <option key={k} value={k}>{k} GB</option>)}
            </select>
            <input value={filterWarna} onChange={(e) => setFilterWarna(e.target.value)} placeholder="Warna..." className="input-focus h-10 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm w-28" aria-label="Filter warna" />
            {hasActiveFilter && (
              <button onClick={() => { setFilterStatus(""); setFilterModel(""); setFilterKapasitas(""); setFilterWarna(""); setQ(""); }} className="px-3 py-2 rounded-sm border border-error/30 text-error hover:bg-error-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">filter_alt_off</span> Reset</button>
            )}
            <button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30 text-xs"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil</span>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden ambient-shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[880px]">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant/50">
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[130px]">IMEI5</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Model</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[100px]">Kapasitas</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[110px]">Warna</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[90px]">Battery</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[120px]">Stok</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[120px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center"><span className="inline-flex items-center gap-2 text-on-surface-variant"><span className="w-5 h-5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat data unit...</span></td></tr>
              ) : err ? (
                <tr><td colSpan={7} className="py-12 text-center"><div className="text-error text-sm font-medium">{err}</div><button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-[48px] opacity-30">inventory_2</span>
                    <span className="text-base font-medium">{hasActiveFilter ? "Tidak ada hasil filter" : "Belum ada unit"}</span>
                    <span className="text-sm">{hasActiveFilter ? "Coba ubah filter pencarian" : "Tambah unit baru via Pembelian"}</span>
                  </div>
                </td></tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.imei5} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0 cursor-pointer" onClick={() => getUnitHpById(u.imei5).then(setDetail).catch(() => {})}>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">{u.imei5}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 grid place-items-center text-primary">
                          <span className="material-symbols-outlined text-[18px]">smartphone</span>
                        </div>
                        <div>
                          <span className="font-medium text-on-surface block">{u.model?.namaModel ?? `#${u.idModel}`}</span>
                          <span className="text-xs text-on-surface-variant">ID Model: {u.idModel}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant font-mono">{u.kapasitasGb ? `${u.kapasitasGb} GB` : "—"}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{u.warna ?? "—"}</td>
                    <td className="py-3 px-4 text-on-surface-variant">
                      {u.batteryHealth != null ? (
                        <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${u.batteryHealth >= 80 ? "bg-primary/10 text-primary" : u.batteryHealth >= 60 ? "bg-secondary/10 text-secondary" : "bg-error/10 text-error"}`}>
                          <span className="material-symbols-outlined text-[14px]">battery_{u.batteryHealth >= 80 ? "full" : u.batteryHealth >= 60 ? "6_bar" : "2_bar"}</span>
                          {u.batteryHealth}%
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${statusColor(u.statusStok)}`}>
                        <span className="material-symbols-outlined text-[14px]">{statusIcon(u.statusStok)}</span>
                        {statusLabel(u.statusStok)}
                      </span>
                    </td>
                    <td className="py-3 px-4"><div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => getUnitHpById(u.imei5).then(setDetail)} className="w-9 h-9 grid place-items-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition" title="Lihat detail"><span className="material-symbols-outlined text-[20px]">visibility</span></button>
                    </div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
          <span>Total {data.length} unit • {filtered.length} ditampilkan</span>
          <span className="hidden sm:inline">read-only</span>
        </div>
      </div>

      {/* Detail Drawer */}
      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-on-background/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-[440px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-modal overflow-y-auto animate-slide-in-right">
            <div className="h-1 w-full bg-primary" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-on-surface">Detail Unit</h3>
                  <p className="text-sm text-on-surface-variant mt-0.5 font-mono">{detail.imei5}</p>
                </div>
                <button onClick={() => setDetail(null)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-xs text-on-surface-variant">Model</div><div className="font-medium">{detail.model?.namaModel ?? detail.idModel}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Status</div><span className={`inline-flex mt-1 px-2 py-1 rounded-full text-xs font-bold border ${statusColor(detail.statusStok)}`}><span className="material-symbols-outlined text-[12px] mr-1">{statusIcon(detail.statusStok)}</span>{statusLabel(detail.statusStok)}</span></div>
                  <div><div className="text-xs text-on-surface-variant">Kapasitas</div><div className="font-mono">{detail.kapasitasGb ? `${detail.kapasitasGb} GB` : "—"}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Warna</div><div>{detail.warna ?? "—"}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Region</div><div>{detail.regionGaransi ?? "—"}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Battery Health</div><div>{detail.batteryHealth != null ? `${detail.batteryHealth}%` : "—"}</div></div>
                </div>
                {detail.keteranganKondisi && <div><div className="text-xs text-on-surface-variant">Keterangan Kondisi</div><div className="mt-1 p-3 rounded-lg bg-surface-container border border-outline-variant/20">{detail.keteranganKondisi}</div></div>}
                <button onClick={() => setDetail(null)} className="w-full h-10 rounded-sm border border-outline-variant text-sm font-medium hover:bg-surface-container transition mt-2">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
