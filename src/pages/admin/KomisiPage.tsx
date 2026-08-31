import { Fragment, useEffect, useState } from "react";
import { getKomisi, getKomisiSummary, getKomisiByPegawai, getKomisiById, type Komisi, type KomisiSummary } from "../../lib/komisi";
import { getPegawai, type Pegawai } from "../../lib/pegawai";
import { getAktivitas, type Aktivitas } from "../../lib/aktivitas";
import { localMonthStr } from "../../lib/utils";

function fmtIDR(s: string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(s));
}
function fmtTgl(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); }
}

export default function KomisiPage() {
  const [summary, setSummary] = useState<KomisiSummary | null>(null);
  const [data, setData] = useState<Komisi[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [aktivitas, setAktivitas] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [detail, setDetail] = useState<Komisi | null>(null);
  const [filterPegawai, setFilterPegawai] = useState<number | "">("");
  const [filterAktivitas, setFilterAktivitas] = useState<string>("");
  const [q, setQ] = useState("");
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [collapsedKeys, setCollapsedKeys] = useState<Set<string>>(new Set());

  const currentPeriode = localMonthStr();
  const [periodeMode, setPeriodeMode] = useState<"all" | "periode" | "tanggal" | "range" | "bulanTahun">("periode");
  const [periodeVal, setPeriodeVal] = useState(currentPeriode);
  const [tanggalVal, setTanggalVal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bulanVal, setBulanVal] = useState("");
  const [tahunVal, setTahunVal] = useState("");

  const buildQuery = () => {
    if (periodeMode === "periode" && periodeVal) return { periode: periodeVal };
    if (periodeMode === "tanggal" && tanggalVal) return { tanggal: tanggalVal };
    if (periodeMode === "range" && startDate && endDate) return { startDate, endDate };
    if (periodeMode === "bulanTahun" && bulanVal && tahunVal) return { bulan: bulanVal, tahun: tahunVal, month: bulanVal, year: tahunVal } as never;
    return undefined;
  };

  const fetchAll = async () => {
    setLoading(true); setErr(null);
    const qy = buildQuery();
    try {
      const [kom, sum, pg, akt] = await Promise.all([
        filterPegawai ? getKomisiByPegawai(Number(filterPegawai), qy) : getKomisi(qy),
        getKomisiSummary(qy).catch(() => null),
        getPegawai().catch(() => [] as Pegawai[]),
        getAktivitas().catch(() => [] as Aktivitas[]),
      ]);
      setData(Array.isArray(kom) ? kom : []);
      setSummary(sum);
      setPegawai(Array.isArray(pg) ? pg : []);
      setAktivitas(Array.isArray(akt) ? akt : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, [filterPegawai, periodeMode, periodeVal, tanggalVal, startDate, endDate, bulanVal, tahunVal]);

  const getAktivitasName = (r: Komisi) => r.aktivitas?.namaAktivitas ?? r.peranTugas ?? `#${r.idAktivitas ?? "?"}`;
  const getTgl = (r: Komisi) => {
    const iso = r.penjualan?.tanggalKeluar ?? r.pembelian?.tanggalMasuk;
    if (!iso) return "—";
    try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); }
  };

  const filtered = data.filter((r) => {
    if (filterAktivitas && getAktivitasName(r) !== filterAktivitas) return false;
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return getAktivitasName(r).toLowerCase().includes(s) || (r.pegawai?.namaPegawai.toLowerCase().includes(s) ?? false) || String(r.idKomisi).includes(s) || (r.penjualan?.unitHp?.model?.namaModel.toLowerCase().includes(s) ?? false) || (r.pembelian?.unitHp?.model?.namaModel.toLowerCase().includes(s) ?? false) || (r.penjualan?.unitHp?.imei5.toLowerCase().includes(s) ?? false) || (r.pembelian?.unitHp?.imei5.toLowerCase().includes(s) ?? false);
  });

  type Group = {
    key: string;
    imei: string;
    model: string;
    items: Komisi[];
    totalKomisi: number;
    sources: { label: string; tgl: string; id: number | null }[];
  };

  const groups: Group[] = (() => {
    const map = new Map<string, Group>();
    for (const r of filtered) {
      const imei = r.penjualan?.unitHp?.imei5 ?? r.pembelian?.unitHp?.imei5 ?? `unknown-${r.idKomisi}`;
      const key = imei;
      if (!map.has(key)) {
        map.set(key, {
          key,
          imei,
          model: r.penjualan?.unitHp?.model?.namaModel ?? r.pembelian?.unitHp?.model?.namaModel ?? "—",
          items: [],
          totalKomisi: 0,
          sources: [],
        });
      }
      const g = map.get(key)!;
      g.items.push(r);
      g.totalKomisi += Number(r.nominalKomisi);
      const srcLabel = r.idPenjualan ? `Penjualan #${r.idPenjualan}` : r.idPembelian ? `Pembelian #${r.idPembelian}` : "—";
      const srcTgl = getTgl(r);
      if (!g.sources.some(s => s.label === srcLabel)) {
        g.sources.push({ label: srcLabel, tgl: srcTgl, id: r.idPenjualan ?? r.idPembelian ?? null });
      }
    }
    return Array.from(map.values());
  })();

  const toggleGroup = (key: string) => {
    setCollapsedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight leading-none">Komisi</h1>
          <p className="text-sm text-on-surface-variant mt-2">Komisi pegawai dari aktivitas pembelian & penjualan.</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex rounded-sm border border-outline-variant overflow-hidden text-xs">
            <button onClick={() => setViewMode("grouped")} className={`px-3 py-2 font-medium transition ${viewMode === "grouped" ? "bg-primary text-on-primary" : "bg-surface-bright text-on-surface-variant hover:bg-surface-container"}`}>Grouped</button>
            <button onClick={() => setViewMode("flat")} className={`px-3 py-2 font-medium transition ${viewMode === "flat" ? "bg-primary text-on-primary" : "bg-surface-bright text-on-surface-variant hover:bg-surface-container"}`}>Flat</button>
          </div>
          <button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 ambient-shadow-sm">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Total Komisi</div>
          <div className="text-2xl font-bold text-primary mt-1">{summary ? fmtIDR(summary.totalKomisi) : "—"}</div>
          <div className="text-xs text-on-surface-variant mt-1">{summary?.totalTransaksi ?? 0} transaksi</div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 ambient-shadow-sm">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Top Pegawai</div>
          <div className="mt-2 space-y-1">
            {(summary?.perPegawai.slice(0, 3) ?? []).map((p) => <div key={p.idPegawai} className="flex justify-between text-sm"><span className="font-medium">{p.namaPegawai}</span><span className="font-mono text-primary">{fmtIDR(p.total)}</span></div>)}
            {(!summary || summary.perPegawai.length === 0) && <div className="text-xs text-on-surface-variant">— belum ada</div>}
          </div>
        </div>
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 ambient-shadow-sm">
          <div className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Per Aktivitas</div>
          <div className="mt-2 space-y-1">
            {(summary?.perAktivitas ?? summary?.perPeran?.map((p) => ({ idAktivitas: 0, namaAktivitas: p.peranTugas, total: p.total, count: p.count })) ?? []).map((r: { idAktivitas: number; namaAktivitas: string; total: string; count: number }) => <div key={r.namaAktivitas} className="flex justify-between text-sm"><span>{r.namaAktivitas}</span><span className="font-mono">{fmtIDR(r.total)}</span></div>)}
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-[420px]">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari model, IMEI..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil</span>
              <button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span></button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant flex items-center gap-1.5 shrink-0">
              <span className="material-symbols-outlined text-[16px]">filter_alt</span> Filter:
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              <select value={filterAktivitas} onChange={(e) => setFilterAktivitas(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm w-full sm:w-auto">
                <option value="">Semua aktivitas</option>
                {[...new Set(aktivitas.map((a) => a.namaAktivitas))].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select value={filterPegawai} onChange={(e) => setFilterPegawai(e.target.value ? Number(e.target.value) : "")} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm w-full sm:w-auto">
                <option value="">Semua pegawai</option>
                {pegawai.map((p) => <option key={p.idPegawai} value={p.idPegawai}>{p.namaPegawai}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center p-3 rounded-lg bg-surface-container border border-outline-variant/30">
            <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant flex items-center gap-1.5 shrink-0">
              <span className="material-symbols-outlined text-[16px]">calendar_month</span> Periode:
            </span>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
              <select value={periodeMode} onChange={(e) => setPeriodeMode(e.target.value as never)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto">
                <option value="all">Semua</option>
                <option value="periode">Per Bulan</option>
                <option value="tanggal">Per Tanggal</option>
                <option value="range">Rentang</option>
                <option value="bulanTahun">Bulan & Tahun</option>
              </select>
              {periodeMode === "periode" && <input type="month" value={periodeVal} onChange={(e) => setPeriodeVal(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />}
              {periodeMode === "tanggal" && <input type="date" value={tanggalVal} onChange={(e) => setTanggalVal(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />}
              {periodeMode === "range" && (
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />
                  <span className="text-on-surface-variant text-sm">—</span>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />
                </div>
              )}
              {periodeMode === "bulanTahun" && (
                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  <input type="number" min={1} max={12} placeholder="Bulan" value={bulanVal} onChange={(e) => setBulanVal(e.target.value)} className="h-9 w-full sm:w-24 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm" />
                  <input type="number" min={2000} max={2100} placeholder="Tahun" value={tahunVal} onChange={(e) => setTahunVal(e.target.value)} className="h-9 w-full sm:w-28 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm" />
                </div>
              )}
              {periodeMode !== "all" && <button onClick={() => { setPeriodeVal(""); setTanggalVal(""); setStartDate(""); setEndDate(""); setBulanVal(""); setTahunVal(""); setPeriodeMode("all"); }} className="h-9 px-3 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium w-full sm:w-auto">Reset</button>}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden ambient-shadow-sm">
        {/* Mobile View: Cards */}
        <div className="block lg:hidden divide-y divide-outline-variant/20 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="py-10 text-center">
              <span className="inline-flex items-center gap-2 text-on-surface-variant">
                <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                Memuat...
              </span>
            </div>
          ) : err ? (
            <div className="py-10 text-center">
              <div className="text-error text-sm font-medium">{err}</div>
              <button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-on-surface-variant text-sm">Belum ada data.</div>
          ) : viewMode === "grouped" ? (
            groups.map((group) => {
              const collapsed = collapsedKeys.has(group.key);
              return (
                <div key={group.key}>
                  {/* Group header card */}
                  <div 
                    className="p-4 bg-surface-container hover:bg-surface-container-high transition cursor-pointer space-y-2"
                    onClick={() => toggleGroup(group.key)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="material-symbols-outlined text-[18px] text-on-surface-variant shrink-0">{collapsed ? "chevron_right" : "expand_more"}</span>
                        <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary shrink-0">
                          <span className="material-symbols-outlined text-[16px]">smartphone</span>
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-on-surface truncate">{group.model}</div>
                          <div className="font-mono text-xs text-primary truncate">{group.imei}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-on-surface-variant">{group.items.length} komisi</div>
                        <div className="font-bold text-primary text-sm">{fmtIDR(group.totalKomisi.toFixed(2))}</div>
                      </div>
                    </div>
                    <div className="pl-[46px] space-y-0.5">
                      {group.sources.map((s, si) => (
                        <div key={si} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                          <span className="material-symbols-outlined text-[12px]">{s.label.startsWith("Penj") ? "point_of_sale" : "shopping_bag"}</span>
                          {s.label} <span className="text-on-surface-variant/70">• {s.tgl}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Group items */}
                  {!collapsed && group.items.map((r, i) => (
                    <div 
                      key={r.idKomisi} 
                      className="px-4 py-3 hover:bg-surface-container-low transition cursor-pointer border-l-2 border-primary/20 ml-4"
                      onClick={() => getKomisiById(r.idKomisi).then(setDetail).catch(() => setDetail(r))}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">{getAktivitasName(r)}</span>
                        <span className="font-mono font-semibold text-primary text-sm">{fmtIDR(r.nominalKomisi)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 text-xs text-on-surface-variant">
                        <span className="font-medium">{r.pegawai?.namaPegawai ?? `#${r.idPegawai}`}</span>
                        <span className="font-mono">{parseFloat(r.persentaseBerlaku).toFixed(2)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })
          ) : (
            filtered.map((r, i) => (
              <div 
                key={r.idKomisi} 
                className="p-4 hover:bg-surface-container-low transition cursor-pointer space-y-2"
                onClick={() => getKomisiById(r.idKomisi).then(setDetail).catch(() => setDetail(r))}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">{getAktivitasName(r)}</span>
                  <span className="font-mono font-semibold text-primary text-sm">{fmtIDR(r.nominalKomisi)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <div className="font-medium text-on-surface truncate">
                      {r.penjualan?.unitHp?.model?.namaModel ?? r.pembelian?.unitHp?.model?.namaModel ?? "—"}
                    </div>
                    <div className="font-mono text-primary">
                      {r.penjualan?.unitHp?.imei5 ?? r.pembelian?.unitHp?.imei5 ?? "—"}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-on-surface-variant">{r.idPenjualan ? `Jual #${r.idPenjualan}` : r.idPembelian ? `Beli #${r.idPembelian}` : "—"}</div>
                    <div className="text-on-surface-variant">{r.pegawai?.namaPegawai ?? `#${r.idPegawai}`}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant/50 sticky top-0 z-10">
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[50px] text-center">#</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[80px]">ID</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Model / IMEI</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Transaksi</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Aktivitas</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Pegawai</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[70px] text-right">%</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[130px] text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={8} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-on-surface-variant"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />Memuat...</span></td></tr>
              ) : err ? (
                <tr><td colSpan={8} className="py-10 text-center"><div className="text-error text-sm font-medium">{err}</div><button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-on-surface-variant text-sm">Belum ada data.</td></tr>
              ) : viewMode === "grouped" ? (
                groups.map((group) => {
                  const collapsed = collapsedKeys.has(group.key);
                  return (
                    <Fragment key={group.key}>
                      <tr className="bg-surface-container border-b border-outline-variant/40 cursor-pointer hover:bg-surface-container-high transition" onClick={() => toggleGroup(group.key)}>
                        <td className="py-2.5 px-4 text-center">
                          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">{collapsed ? "chevron_right" : "expand_more"}</span>
                        </td>
                        <td colSpan={2} className="py-2.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary shrink-0"><span className="material-symbols-outlined text-[16px]">smartphone</span></div>
                            <div>
                              <div className="font-semibold text-on-surface">{group.model}</div>
                              <div className="font-mono text-xs text-primary">{group.imei}</div>
                            </div>
                          </div>
                        </td>
                        <td colSpan={1} className="py-2.5 px-4">
                          <div className="space-y-0.5">
                            {group.sources.map((s, si) => (
                              <div key={si} className="flex items-center gap-1.5 text-xs text-on-surface-variant">
                                <span className="material-symbols-outlined text-[12px]">{s.label.startsWith("Penj") ? "point_of_sale" : "shopping_bag"}</span>
                                {s.label} <span className="text-on-surface-variant/70">• {s.tgl}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td colSpan={3} className="py-2.5 px-4 text-right">
                          <div className="text-xs text-on-surface-variant">{group.items.length} komisi</div>
                          <div className="font-bold text-primary">{fmtIDR(group.totalKomisi.toFixed(2))}</div>
                        </td>
                      </tr>
                  {!collapsed && group.items.map((r) => (
                        <tr key={r.idKomisi} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition cursor-pointer" onClick={() => getKomisiById(r.idKomisi).then(setDetail).catch(() => setDetail(r))}>
                          <td className="py-2.5 px-4 text-center text-on-surface-variant">{i + 1}</td>
                          <td className="py-2.5 px-4 font-mono text-xs text-on-surface-variant">#{r.idKomisi}</td>
                          <td className="py-2.5 px-4 text-on-surface-variant">—</td>
                          <td className="py-2.5 px-4 text-on-surface-variant">—</td>
                          <td className="py-2.5 px-4"><span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">{getAktivitasName(r)}</span></td>
                          <td className="py-2.5 px-4 font-medium">{r.pegawai?.namaPegawai ?? `#${r.idPegawai}`}</td>
                          <td className="py-2.5 px-4 text-right font-mono">{parseFloat(r.persentaseBerlaku).toFixed(2)}%</td>
                          <td className="py-2.5 px-4 text-right font-mono font-semibold text-primary">{fmtIDR(r.nominalKomisi)}</td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              ) : (
            filtered.map((r) => (
                  <tr key={r.idKomisi} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition cursor-pointer" onClick={() => getKomisiById(r.idKomisi).then(setDetail).catch(() => setDetail(r))}>
                    <td className="py-2.5 px-4 text-center text-on-surface-variant">{i + 1}</td>
                    <td className="py-2.5 px-4 font-mono text-xs text-on-surface-variant">#{r.idKomisi}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-on-surface">{r.penjualan?.unitHp?.model?.namaModel ?? r.pembelian?.unitHp?.model?.namaModel ?? "—"}</div>
                      <div className="font-mono text-xs text-primary">{r.penjualan?.unitHp?.imei5 ?? r.pembelian?.unitHp?.imei5 ?? "—"}</div>
                    </td>
                    <td className="py-2.5 px-4 text-on-surface-variant text-xs">{r.idPenjualan ? `Jual #${r.idPenjualan}` : r.idPembelian ? `Beli #${r.idPembelian}` : "—"}</td>
                    <td className="py-2.5 px-4"><span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">{getAktivitasName(r)}</span></td>
                    <td className="py-2.5 px-4 font-medium">{r.pegawai?.namaPegawai ?? `#${r.idPegawai}`}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{parseFloat(r.persentaseBerlaku).toFixed(2)}%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-primary">{fmtIDR(r.nominalKomisi)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 text-xs text-on-surface-variant">{groups.length} unit • {filtered.length} komisi</div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-on-background/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-[420px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-modal overflow-y-auto">
            <div className="h-1 w-full bg-primary" />
            <div className="p-6">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold text-on-surface">Komisi #{detail.idKomisi}</h3>
                <button onClick={() => setDetail(null)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div><div className="text-xs text-on-surface-variant">Pegawai</div><div className="font-medium">{detail.pegawai?.namaPegawai ?? `#${detail.idPegawai}`}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Aktivitas</div><div className="font-medium">{getAktivitasName(detail)}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Sumber</div><div className="font-mono text-xs">{detail.idPenjualan ? `Penjualan #${detail.idPenjualan}` : detail.idPembelian ? `Pembelian #${detail.idPembelian}` : "—"}</div></div>
                  <div><div className="text-xs text-on-surface-variant">Nominal</div><div className="font-mono font-bold text-primary">{fmtIDR(detail.nominalKomisi)}</div></div>
                  <div><div className="text-xs text-on-surface-variant">%</div><div className="font-mono">{parseFloat(detail.persentaseBerlaku).toFixed(2)}%</div></div>
                </div>
                {(detail.penjualan?.unitHp ?? detail.pembelian?.unitHp) && (
                  <div>
                    <div className="text-xs text-on-surface-variant mb-1">Unit</div>
                    <div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20">
                      <div className="font-medium">{detail.penjualan?.unitHp?.model?.namaModel ?? detail.pembelian?.unitHp?.model?.namaModel}</div>
                      <div className="font-mono text-xs text-primary">{detail.penjualan?.unitHp?.imei5 ?? detail.pembelian?.unitHp?.imei5}</div>
                    </div>
                  </div>
                )}
                {detail.penjualan && (
                  <div><div className="text-xs text-on-surface-variant">Tanggal Penjualan</div><div>{fmtTgl(detail.penjualan.tanggalKeluar ?? "")}</div></div>
                )}
                {detail.pembelian && (
                  <div><div className="text-xs text-on-surface-variant">Tanggal Pembelian</div><div>{fmtTgl(detail.pembelian.tanggalMasuk ?? "")}</div></div>
                )}
                <button onClick={() => setDetail(null)} className="w-full h-9 rounded-sm border border-outline-variant text-sm mt-2">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
