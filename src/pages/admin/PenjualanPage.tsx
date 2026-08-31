import { useEffect, useMemo, useState } from "react";
import { createPenjualan, getPenjualan, getPenjualanById, type Penjualan } from "../../lib/penjualan";
import { getPegawai, type Pegawai } from "../../lib/pegawai";
import { getPembelian, type Pembelian, type PembelianQuery } from "../../lib/pembelian";
import { getAktivitas, getAktivitasAktif, type Aktivitas } from "../../lib/aktivitas";

function fmtIDR(s: string | number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(s));
}
function fmtTgl(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); }
}

export default function PenjualanPage() {
  const [data, setData] = useState<Penjualan[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [pembelianList, setPembelianList] = useState<Pembelian[]>([]);
  const [aktivitasMaster, setAktivitasMaster] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const currentPeriode = new Date().toISOString().slice(0, 7);
  const [periodeMode, setPeriodeMode] = useState<"all" | "periode" | "tanggal" | "range" | "bulanTahun">("periode");
  const [periodeVal, setPeriodeVal] = useState(currentPeriode);
  const [tanggalVal, setTanggalVal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bulanVal, setBulanVal] = useState("");
  const [tahunVal, setTahunVal] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ imei5: "", tanggalKeluar: new Date().toISOString().slice(0, 10), hargaJual: "", profitKotor: "" });
  const [aktivitasRows, setAktivitasRows] = useState<{ idAktivitas: number; idPegawai: number }[]>([{ idAktivitas: 0, idPegawai: 0 }]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<Penjualan | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchAll = async () => {
    setLoading(true); setErr(null);
    try {
      const [penjualan, pg, pembelian, akt] = await Promise.all([
        getPenjualan(),
        getPegawai().catch(() => [] as Pegawai[]),
        getPembelian().catch(() => [] as Pembelian[]),
        getAktivitasAktif().catch(() => getAktivitas().catch(() => [] as Aktivitas[])),
      ]);
      setData(Array.isArray(penjualan) ? penjualan : []);
      setPegawai(Array.isArray(pg) ? pg : []);
      setPembelianList(Array.isArray(pembelian) ? pembelian : []);
      setAktivitasMaster(Array.isArray(akt) ? akt : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const buildQuery = (): PembelianQuery | undefined => {
    if (periodeMode === "periode" && periodeVal) return { periode: periodeVal };
    if (periodeMode === "tanggal" && tanggalVal) return { tanggal: tanggalVal };
    if (periodeMode === "range" && startDate && endDate) return { startDate, endDate };
    if (periodeMode === "bulanTahun" && bulanVal && tahunVal) return { bulan: bulanVal, tahun: tahunVal, month: bulanVal, year: tahunVal };
    return undefined;
  };

  const filtered = data.filter((r) => {
    const qPass = !q.trim() || (() => {
      const s = q.toLowerCase();
      const aktText = (r.aktivitas ?? []).map((a) => `${a.aktivitas.namaAktivitas} ${a.pegawai.namaPegawai}`).join(" ").toLowerCase();
      return r.imei5.toLowerCase().includes(s) || (r.unitHp?.model?.namaModel.toLowerCase().includes(s) ?? false) || aktText.includes(s) || String(r.idPenjualan).includes(s);
    })();
    if (!qPass) return false;
    const query = buildQuery();
    if (!query) return true;
    const tgl = new Date(r.tanggalKeluar);
    if (query.periode) {
      const m = query.periode.match(/^(\d{4})-(\d{2})$/);
      if (m) return tgl.getUTCFullYear() === Number(m[1]) && tgl.getUTCMonth() === Number(m[2]) - 1;
    }
    if (query.tanggal) {
      return tgl.toISOString().slice(0, 10) === query.tanggal;
    }
    if (query.startDate && query.endDate) {
      const sd = new Date(query.startDate); const ed = new Date(query.endDate);
      return tgl >= sd && tgl <= ed;
    }
    if (query.bulan != null && query.tahun != null) {
      return tgl.getUTCFullYear() === Number(query.tahun) && tgl.getUTCMonth() === Number(query.bulan) - 1;
    }
    return true;
  });

  const pembelianMap = useMemo(() => {
    const m = new Map<string, Pembelian>();
    for (const p of pembelianList) m.set(p.imei5, p);
    return m;
  }, [pembelianList]);

  const soldSet = new Set(data.map((p) => p.imei5));
  const availableImei = pembelianList.filter((p) => !soldSet.has(p.imei5)).map((p) => p.imei5);
  const displayImei = availableImei;
  const selectedPembelian = pembelianMap.get(form.imei5);

  const openCreate = () => {
    setForm({ imei5: displayImei[0] ?? "", tanggalKeluar: new Date().toISOString().slice(0, 10), hargaJual: "", profitKotor: "" });
    setAktivitasRows([{ idAktivitas: aktivitasMaster[0]?.idAktivitas ?? 0, idPegawai: pegawai[0]?.idPegawai ?? 0 }]);
    setFormErr(null); setShowForm(true);
  };
  const updateRow = (idx: number, patch: Partial<{ idAktivitas: number; idPegawai: number }>) => setAktivitasRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setAktivitasRows((prev) => [...prev, { idAktivitas: aktivitasMaster[0]?.idAktivitas ?? 0, idPegawai: pegawai[0]?.idPegawai ?? 0 }]);
  const removeRow = (idx: number) => setAktivitasRows((prev) => prev.filter((_, i) => i !== idx));

  const renderAktivitasCell = (r: Penjualan) => {
    if (r.aktivitas && r.aktivitas.length) return <div className="flex flex-wrap gap-1">{r.aktivitas.map((a) => <span key={`${a.idAktivitas}-${a.idPegawai}`} className="inline-flex px-2 py-0.5 rounded-full text-xs border bg-primary/10 border-primary/15 text-primary">{a.aktivitas.namaAktivitas}: {a.pegawai.namaPegawai}</span>)}</div>;
    if (r.picBuyer || r.picCodJual) return <div className="text-xs"><div className="font-medium">{r.picBuyer?.namaPegawai ?? `#${r.idPicBuyer}`}</div><div className="text-on-surface-variant">{r.picCodJual?.namaPegawai ?? `#${r.idPicCodJual}`}</div></div>;
    return <span className="text-on-surface-variant">—</span>;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr(null);
    if (!form.imei5.trim()) return setFormErr("IMEI5 wajib — pilih dari pembelian belum terjual.");
    if (soldSet.has(form.imei5.trim())) return setFormErr("IMEI ini sudah terjual (409).");
    if (!pembelianMap.has(form.imei5.trim())) return setFormErr("IMEI tidak ditemukan di pembelian — buat pembelian dulu.");
    if (!form.tanggalKeluar) return setFormErr("Tanggal keluar wajib.");
    if (Number.isNaN(Date.parse(form.tanggalKeluar))) return setFormErr("Tanggal tidak valid.");
    const hj = Number(form.hargaJual);
    if (form.hargaJual.trim() === "" || Number.isNaN(hj) || hj < 0) return setFormErr("Harga jual >=0.");
    if (!/^\d+(\.\d{1,2})?$/.test(form.hargaJual.trim())) return setFormErr("Harga max 2 desimal.");
    let profit: number | undefined;
    if (form.profitKotor.trim() !== "") {
      profit = Number(form.profitKotor);
      if (Number.isNaN(profit) || profit < 0) return setFormErr("Profit >=0.");
      if (!/^\d+(\.\d{1,2})?$/.test(form.profitKotor.trim())) return setFormErr("Profit max 2 desimal.");
      if (profit > hj) return setFormErr("Profit tidak boleh melebihi harga jual.");
    }
    const rows = aktivitasRows.filter((r) => r.idAktivitas && r.idPegawai);
    if (aktivitasRows.some((r) => (r.idAktivitas && !r.idPegawai) || (!r.idAktivitas && r.idPegawai))) return setFormErr("Lengkapi baris aktivitas: pilih aktivitas & pegawai.");
    if (new Set(rows.map((r) => r.idAktivitas)).size !== rows.length) return setFormErr("Aktivitas duplikat dalam 1 penjualan.");
    for (const r of rows) {
      if (!pegawai.some((p) => p.idPegawai === r.idPegawai)) return setFormErr(`Pegawai #${r.idPegawai} tidak ditemukan.`);
      if (!aktivitasMaster.some((a) => a.idAktivitas === r.idAktivitas)) return setFormErr(`Aktivitas #${r.idAktivitas} tidak ditemukan.`);
    }
    setSubmitting(true);
    try {
      const created = await createPenjualan({
        imei5: form.imei5.trim(),
        tanggalKeluar: form.tanggalKeluar,
        hargaJual: hj,
        ...(profit !== undefined ? { profitKotor: profit } : {}),
        ...(rows.length ? { aktivitas: rows } : {}),
      });
      setData((prev) => [created, ...prev]);
      setToast({ msg: `Penjualan #${created.idPenjualan} dibuat • ${rows.length} aktivitas`, type: "ok" });
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("sudah terjual") || msg.includes("409")) setFormErr("IMEI sudah terjual.");
      else if (msg.includes("tidak ditemukan")) setFormErr(msg);
      else setFormErr(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight leading-none">Penjualan</h1>
          <p className="text-sm text-on-surface-variant mt-2">Jual unit via <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/api/penjualan</code> — aktivitas dinamis • {data.length} data.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm self-start md:self-auto"><span className="material-symbols-outlined text-[18px]">point_of_sale</span> Catat Penjualan</button>
      </div>
      {toast && <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}><span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>{toast.msg}</div>}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]"><span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari IMEI, model, aktivitas..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
          <div className="flex items-center gap-2 text-xs"><span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil</span><button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button></div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center p-3 rounded-lg bg-surface-container border border-outline-variant/30 mt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span> Periode:
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <select value={periodeMode} onChange={(e) => setPeriodeMode(e.target.value as never)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto">
              <option value="all">Semua waktu</option>
              <option value="periode">per-bulan</option>
              <option value="tanggal">per-tanggal</option>
              <option value="range">awal & akhir tgl</option>
              <option value="bulanTahun">bulan & tahun</option>
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
                <input type="number" min={1} max={12} placeholder="bulan" value={bulanVal} onChange={(e) => setBulanVal(e.target.value)} className="h-9 w-full sm:w-24 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm" />
                <input type="number" min={2000} max={2100} placeholder="tahun" value={tahunVal} onChange={(e) => setTahunVal(e.target.value)} className="h-9 w-full sm:w-28 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm" />
              </div>
            )}
            {periodeMode !== "all" && <button onClick={() => { setPeriodeVal(""); setTanggalVal(""); setStartDate(""); setEndDate(""); setBulanVal(""); setTahunVal(""); setPeriodeMode("all"); }} className="h-9 px-3 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium w-full sm:w-auto">Reset</button>}
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
            <div className="py-10 text-center text-on-surface-variant text-sm">
              {q ? "Tidak ada hasil." : "Belum ada penjualan."}
            </div>
          ) : (
            filtered.map((r) => (
              <div 
                key={r.idPenjualan} 
                className="p-4 hover:bg-surface-container-low transition cursor-pointer space-y-3"
                onClick={() => getPenjualanById(r.idPenjualan).then(setDetail).catch(() => setDetail(r))}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-on-surface-variant font-medium">#{r.idPenjualan}</span>
                  <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-sm border border-outline-variant/30">{fmtTgl(r.tanggalKeluar)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface text-base leading-snug">
                    {r.unitHp?.model?.namaModel ?? "—"}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/15">{r.imei5}</span>
                    <span className="font-mono text-sm font-bold text-primary">{fmtIDR(r.hargaJual)}</span>
                    {Number(r.profitKotor) > 0 && (
                      <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Profit {fmtIDR(r.profitKotor)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-outline-variant/10">
                  {renderAktivitasCell(r)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant/50 sticky top-0 z-10">
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[80px]">ID</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[110px]">IMEI5</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Model</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[100px]">Tgl Keluar</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[130px] text-right">Harga Jual</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[130px] text-right">Profit</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Aktivitas</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[80px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <span className="inline-flex items-center gap-2 text-on-surface-variant">
                      <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                      Memuat...
                    </span>
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center">
                    <div className="text-error text-sm font-medium">{err}</div>
                    <button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-on-surface-variant text-sm">
                    {q ? "Tidak ada hasil." : "Belum ada penjualan."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr 
                    key={r.idPenjualan} 
                    className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0 cursor-pointer"
                    onClick={() => getPenjualanById(r.idPenjualan).then(setDetail).catch(() => setDetail(r))}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{r.idPenjualan}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">{r.imei5}</td>
                    <td className="py-3 px-4 font-medium">{r.unitHp?.model?.namaModel ?? "—"}</td>
                    <td className="py-3 px-4 text-on-surface-variant">{fmtTgl(r.tanggalKeluar)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-primary">{fmtIDR(r.hargaJual)}</td>
                    <td className="py-3 px-4 text-right font-mono">{fmtIDR(r.profitKotor)}</td>
                    <td className="py-3 px-4">{renderAktivitasCell(r)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => getPenjualanById(r.idPenjualan).then(setDetail)} className="w-8 h-8 grid place-items-center rounded-sm border border-outline-variant hover:bg-surface-container">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 text-xs text-on-surface-variant">
          Total {data.length} data • {filtered.length} ditampilkan
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-on-background/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-[560px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-modal overflow-y-auto">
            <div className="h-1 w-full bg-primary" /><div className="p-6">
              <div className="flex items-start justify-between"><h3 className="text-lg font-semibold">Penjualan #{detail.idPenjualan}</h3><button onClick={() => setDetail(null)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3"><div><div className="text-xs text-on-surface-variant">IMEI5</div><div className="font-mono font-semibold text-primary">{detail.imei5}</div></div><div><div className="text-xs text-on-surface-variant">Model</div><div className="font-medium">{detail.unitHp?.model?.namaModel ?? "—"}</div></div><div><div className="text-xs text-on-surface-variant">Harga Jual</div><div className="font-mono font-bold text-primary">{fmtIDR(detail.hargaJual)}</div></div><div><div className="text-xs text-on-surface-variant">Profit</div><div className="font-mono font-semibold">{fmtIDR(detail.profitKotor)}</div></div></div>
                <div><div className="text-xs font-semibold uppercase tracking-wide mb-2">Aktivitas</div>{detail.aktivitas && detail.aktivitas.length ? <div className="space-y-2">{detail.aktivitas.map((a) => <div key={a.idAktivitas} className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-outline-variant/30"><span className="font-medium">{a.aktivitas.namaAktivitas} <span className="font-mono text-xs text-primary">{parseFloat(a.aktivitas.persentase).toFixed(2)}%</span></span><span className="text-xs">{a.pegawai.namaPegawai}</span></div>)}</div> : <div className="text-xs text-on-surface-variant">{detail.picBuyer ? `${detail.picBuyer.namaPegawai} / ${detail.picCodJual?.namaPegawai ?? ""} (legacy)` : "—"}</div>}</div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2">Komisi — nominal = profit × % /100</div>
                  <div className="border border-outline-variant/30 rounded-lg overflow-hidden">
                    <table className="w-full text-xs border-collapse"><thead><tr className="bg-surface-bright"><th className="py-2 px-3 text-left">Aktivitas</th><th className="py-2 px-3 text-left">Pegawai</th><th className="py-2 px-3 text-right">%</th><th className="py-2 px-3 text-right">Nominal</th></tr></thead>
                      <tbody>{(detail.komisiTransaksi ?? []).map((k) => {
                        const nama = k.aktivitas?.namaAktivitas ?? k.peranTugas ?? `#${k.idAktivitas ?? k.idPegawai}`;
                        return <tr key={k.idKomisi} className="border-t border-outline-variant/20"><td className="py-2 px-3">{nama}</td><td className="py-2 px-3">{k.pegawai?.namaPegawai ?? k.idPegawai}</td><td className="py-2 px-3 text-right font-mono">{parseFloat(k.persentaseBerlaku).toFixed(2)}%</td><td className="py-2 px-3 text-right font-mono font-semibold text-primary">{fmtIDR(k.nominalKomisi)}</td></tr>;
                      })}{(!detail.komisiTransaksi || detail.komisiTransaksi.length === 0) && <tr><td colSpan={4} className="py-4 text-center text-on-surface-variant">— belum ada komisi —</td></tr>}</tbody>
                      {(detail.komisiTransaksi?.length ?? 0) > 0 && <tfoot><tr className="bg-surface-container font-semibold border-t"><td colSpan={3} className="py-2 px-3 text-right">Total</td><td className="py-2 px-3 text-right font-mono text-primary">{fmtIDR((detail.komisiTransaksi ?? []).reduce((s, k) => s + Number(k.nominalKomisi), 0).toString())}</td></tr></tfoot>}
                    </table>
                  </div>
                </div>
                <button onClick={() => setDetail(null)} className="w-full h-9 rounded-sm border border-outline-variant text-sm">Tutup</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]" onClick={() => !submitting && setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-[600px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="h-1 w-full bg-primary" /><div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-1"><div><h2 className="text-lg font-semibold">Catat Penjualan</h2><p className="text-xs text-on-surface-variant mt-1">POST /api/penjualan • aktivitas dinamis • profit auto</p></div><button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
              {formErr && <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container"><span className="material-symbols-outlined text-[18px] mt-0.5">error</span><span>{formErr}</span></div>}
              {aktivitasMaster.length === 0 && <div className="mt-4 px-3 py-2.5 rounded-lg border border-secondary-container/30 bg-secondary-container/10 text-xs text-secondary">Belum ada aktivitas — buat di <a href="/admin/aktivitas" className="underline">Aktivitas</a> (komisi 0%).</div>}
              {pembelianList.length === 0 && <div className="mt-4 text-xs text-error bg-error-container border border-error/15 rounded-lg px-3 py-2">Belum ada pembelian — buat dulu.</div>}
              {pembelianList.length > 0 && displayImei.length === 0 && <div className="mt-4 px-3 py-2.5 rounded-lg border border-secondary-container/30 bg-secondary-container/10 text-xs text-secondary">Semua IMEI sudah terjual ({data.length} penjualan).</div>}
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">IMEI5 — dari pembelian belum terjual <span className="text-error">*</span></label><select value={form.imei5} onChange={(e) => setForm((s) => ({ ...s, imei5: e.target.value }))} className="w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono"><option value="">— pilih imei —</option>{displayImei.map((im) => { const pb = pembelianMap.get(im); return <option key={im} value={im}>{im} — {pb ? `${fmtIDR(pb.hargaBeli)} • ${fmtTgl(pb.tanggalMasuk)}` : ""}</option>; })}</select>{selectedPembelian && <div className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-xs">Harga beli: <b className="font-mono text-primary">{fmtIDR(selectedPembelian.hargaBeli)}</b> • {selectedPembelian.unitHp?.model?.namaModel ?? ""}</div>}</div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Tanggal Keluar *</label><input type="date" value={form.tanggalKeluar} onChange={(e) => setForm((s) => ({ ...s, tanggalKeluar: e.target.value }))} className="w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Harga Jual *</label><input inputMode="decimal" value={form.hargaJual} onChange={(e) => setForm((s) => ({ ...s, hargaJual: e.target.value }))} placeholder="5000000" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono" /></div>
                <div className="space-y-1.5 sm:col-span-2"><label className="text-sm font-medium">Profit Kotor (opsional)</label><input inputMode="decimal" value={form.profitKotor} onChange={(e) => setForm((s) => ({ ...s, profitKotor: e.target.value }))} placeholder="auto = jual - beli jika kosong" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono" /></div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Aktivitas + Pegawai</span><button type="button" onClick={addRow} className="text-xs px-2.5 py-1 rounded-full border border-primary text-primary hover:bg-primary/10 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">add</span> Baris</button></div>
                <div className="space-y-3">
                  {aktivitasRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_40px] gap-2 p-3 sm:p-0 rounded-lg sm:rounded-none bg-surface-container-low sm:bg-transparent border border-outline-variant/30 sm:border-0 relative">
                      <select 
                        value={row.idAktivitas} 
                        onChange={(e) => updateRow(idx, { idAktivitas: Number(e.target.value) })} 
                        className="h-10 px-2 rounded-sm border border-outline-variant bg-surface-bright text-sm w-full"
                      >
                        <option value={0}>— aktivitas —</option>
                        {aktivitasMaster.map((a) => <option key={a.idAktivitas} value={a.idAktivitas}>{a.namaAktivitas} — {parseFloat(a.persentase).toFixed(2)}%</option>)}
                      </select>
                      <select 
                        value={row.idPegawai} 
                        onChange={(e) => updateRow(idx, { idPegawai: Number(e.target.value) })} 
                        className="h-10 px-2 rounded-sm border border-outline-variant bg-surface-bright text-sm w-full"
                      >
                        <option value={0}>— pegawai —</option>
                        {pegawai.map((p) => <option key={p.idPegawai} value={p.idPegawai}>{p.namaPegawai}</option>)}
                      </select>
                      <button 
                        type="button" 
                        onClick={() => removeRow(idx)} 
                        className="h-10 sm:h-10 w-full sm:w-10 grid place-items-center rounded-sm border border-outline-variant text-error hover:bg-error-container sm:self-center transition"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
                {(() => {
                  const hargaBeliStr = pembelianMap.get(form.imei5)?.hargaBeli;
                  const hj = Number(form.hargaJual);
                  const profitManual = form.profitKotor.trim() !== "" ? Number(form.profitKotor) : undefined;
                  const profit = profitManual !== undefined && !Number.isNaN(profitManual) ? profitManual : (!Number.isNaN(hj) && hargaBeliStr ? hj - Number(hargaBeliStr) : undefined);
                  if (profit === undefined || Number.isNaN(profit) || !aktivitasRows.some((r) => r.idAktivitas)) return null;
                  const rows = aktivitasRows.filter((r) => r.idAktivitas).map((r) => {
                    const a = aktivitasMaster.find((x) => x.idAktivitas === r.idAktivitas);
                    const pct = a ? parseFloat(a.persentase) : 0;
                    return { nama: a?.namaAktivitas ?? `#${r.idAktivitas}`, pct, nominal: profit * pct / 100 };
                  });
                  const total = rows.reduce((s, r) => s + r.nominal, 0);
                  return <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs">Preview profit {fmtIDR(profit)} → {rows.map((r) => `${r.nama} ${r.pct.toFixed(2)}% = ${fmtIDR(r.nominal.toString())}`).join(" • ")} • Total {fmtIDR(total.toString())}</div>;
                })()}
              </div>
              <div className="mt-6 flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button><button type="submit" disabled={submitting} className="h-10 px-5 rounded-sm bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60 flex items-center gap-2">{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Simpan Penjualan</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
