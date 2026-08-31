import { useEffect, useState } from "react";
import { createPembelian, getPembelian, getPembelianById, type Pembelian } from "../../lib/pembelian";
import { createUnitHp } from "../../lib/unitHp";
import { getKatalogModel, type KatalogModel } from "../../lib/katalogModel";
import { getPegawai, type Pegawai } from "../../lib/pegawai";
import { getAktivitas, getAktivitasAktif, type Aktivitas } from "../../lib/aktivitas";
import { localDateStr, localMonthStr } from "../../lib/utils";

export default function PembelianPage() {
  const [data, setData] = useState<Pembelian[]>([]);
  const [pegawai, setPegawai] = useState<Pegawai[]>([]);
  const [aktivitasMaster, setAktivitasMaster] = useState<Aktivitas[]>([]);
  const [katalogList, setKatalogList] = useState<KatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const currentPeriode = localMonthStr();
  const [periodeMode, setPeriodeMode] = useState<"all" | "periode" | "tanggal" | "range" | "bulanTahun">("periode");
  const [periodeVal, setPeriodeVal] = useState(currentPeriode);
  const [tanggalVal, setTanggalVal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bulanVal, setBulanVal] = useState("");
  const [tahunVal, setTahunVal] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ imei5: "", tanggalMasuk: localDateStr(), hargaBeli: "", idModel: 0, kapasitasGb: "", warna: "", regionGaransi: "Inter", batteryHealth: "", keteranganKondisi: "" });
  const [aktivitasRows, setAktivitasRows] = useState<{ idAktivitas: number; idPegawai: number }[]>([{ idAktivitas: 0, idPegawai: 0 }]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<Pembelian | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchAll = async () => {
    setLoading(true); setErr(null);
    try {
      const [p, peg, akt, katalog] = await Promise.all([
        getPembelian(),
        getPegawai().catch(() => [] as Pegawai[]),
        getAktivitasAktif().catch(() => getAktivitas().catch(() => [] as Aktivitas[])),
        getKatalogModel().catch(() => [] as KatalogModel[]),
      ]);
      setData(Array.isArray(p) ? p : []);
      setPegawai(Array.isArray(peg) ? peg : []);
      setAktivitasMaster(Array.isArray(akt) ? akt : []);
      setKatalogList(Array.isArray(katalog) ? katalog : []);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const filtered = data.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const aktivText = (r.aktivitas ?? []).map((a) => `${a.aktivitas.namaAktivitas} ${a.pegawai.namaPegawai}`).join(" ").toLowerCase();
    if (!r.imei5.toLowerCase().includes(s) && !(r.unitHp?.model?.namaModel.toLowerCase().includes(s) ?? false) && !aktivText.includes(s) && !String(r.idPembelian).includes(s)) return false;
    if (periodeMode === "all") return true;
    const tgl = new Date(r.tanggalMasuk);
    if (periodeMode === "periode" && periodeVal) {
      const m = periodeVal.match(/^(\d{4})-(\d{2})$/);
      if (m) return tgl.getUTCFullYear() === Number(m[1]) && tgl.getUTCMonth() === Number(m[2]) - 1;
    }
    if (periodeMode === "tanggal" && tanggalVal) {
      return tgl.toISOString().slice(0, 10) === tanggalVal;
    }
    if (periodeMode === "range" && startDate && endDate) {
      const sd = new Date(startDate); const ed = new Date(endDate);
      return tgl >= sd && tgl <= ed;
    }
    if (periodeMode === "bulanTahun" && bulanVal && tahunVal) {
      return tgl.getUTCFullYear() === Number(tahunVal) && tgl.getUTCMonth() === Number(bulanVal) - 1;
    }
    return true;
  });

  const openCreate = () => {
    setForm({ imei5: "", tanggalMasuk: localDateStr(), hargaBeli: "", idModel: katalogList[0]?.idModel ?? 0, kapasitasGb: "", warna: "", regionGaransi: "Inter", batteryHealth: "", keteranganKondisi: "" });
    setAktivitasRows([{ idAktivitas: aktivitasMaster[0]?.idAktivitas ?? 0, idPegawai: pegawai[0]?.idPegawai ?? 0 }]);
    setFormErr(null); setShowForm(true);
  };

  const updateRow = (idx: number, patch: Partial<{ idAktivitas: number; idPegawai: number }>) => setAktivitasRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const addRow = () => setAktivitasRows((prev) => [...prev, { idAktivitas: aktivitasMaster[0]?.idAktivitas ?? 0, idPegawai: pegawai[0]?.idPegawai ?? 0 }]);
  const removeRow = (idx: number) => setAktivitasRows((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr(null);
    const imei = form.imei5.trim();
    if (!imei) return setFormErr("IMEI5 wajib — 5-10 karakter.");
    if (imei.length > 10) return setFormErr("IMEI5 max 10 karakter.");
    if (data.some((p) => p.imei5 === imei)) return setFormErr("IMEI sudah ada di pembelian.");
    if (!form.idModel) return setFormErr("Pilih model.");
    if (!form.tanggalMasuk) return setFormErr("Tanggal masuk wajib.");
    if (Number.isNaN(Date.parse(form.tanggalMasuk))) return setFormErr("Tanggal tidak valid.");
    const harga = Number(form.hargaBeli);
    if (form.hargaBeli.trim() === "" || Number.isNaN(harga) || harga < 0) return setFormErr("Harga beli >= 0.");
    if (!/^\d+(\.\d{1,2})?$/.test(form.hargaBeli.trim())) return setFormErr("Harga max 2 desimal.");
    if (form.kapasitasGb !== "" && Number.isNaN(Number(form.kapasitasGb))) return setFormErr("Kapasitas harus angka.");
    if (form.batteryHealth !== "" && (Number(form.batteryHealth) < 0 || Number(form.batteryHealth) > 100)) return setFormErr("Battery health 0-100.");
    const rows = aktivitasRows.filter((r) => r.idAktivitas && r.idPegawai);
    if (aktivitasRows.some((r) => (r.idAktivitas && !r.idPegawai) || (!r.idAktivitas && r.idPegawai))) return setFormErr("Lengkapi baris aktivitas.");
    const ids = rows.map((r) => r.idAktivitas);
    if (new Set(ids).size !== ids.length) return setFormErr("Aktivitas tidak boleh duplikat.");
    for (const r of rows) {
      if (!pegawai.some((p) => p.idPegawai === r.idPegawai)) return setFormErr(`Pegawai #${r.idPegawai} tidak ditemukan.`);
      if (!aktivitasMaster.some((a) => a.idAktivitas === r.idAktivitas)) return setFormErr(`Aktivitas #${r.idAktivitas} tidak ditemukan.`);
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        imei5: imei,
        idModel: Number(form.idModel),
        statusStok: "Tersedia",
      };
      if (form.kapasitasGb !== "") payload.kapasitasGb = Number(form.kapasitasGb);
      if (form.warna.trim()) payload.warna = form.warna.trim();
      if (form.regionGaransi.trim()) payload.regionGaransi = form.regionGaransi.trim();
      if (form.batteryHealth !== "") payload.batteryHealth = Number(form.batteryHealth);
      if (form.keteranganKondisi.trim()) payload.keteranganKondisi = form.keteranganKondisi.trim();
      await createUnitHp(payload as never);

      const created = await createPembelian({
        imei5: imei,
        tanggalMasuk: form.tanggalMasuk,
        hargaBeli: harga,
        ...(rows.length ? { aktivitas: rows } : {}),
      });
      setData((prev) => [created, ...prev]);
      setToast({ msg: `Pembelian #${created.idPembelian} dibuat • ${rows.length} aktivitas`, type: "ok" });
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("sudah ada") || msg.includes("409")) setFormErr("IMEI sudah ada di pembelian.");
      else setFormErr(msg);
    } finally { setSubmitting(false); }
  };

  const fmtHarga = (s: string) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(s));
  const fmtTgl = (iso: string) => { try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); } };

  const renderAktivitasCell = (r: Pembelian) => {
    if (r.aktivitas && r.aktivitas.length) {
      return <div className="flex flex-wrap gap-1">{r.aktivitas.map((a) => <span key={`${a.idAktivitas}-${a.idPegawai}`} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border bg-primary/10 border-primary/15 text-primary">{a.aktivitas.namaAktivitas}: {a.pegawai.namaPegawai}</span>)}</div>;
    }
    if (r.picSeller || r.picCodBeli) return <div className="text-xs leading-4"><div className="font-medium">{r.picSeller?.namaPegawai ?? (r.idPicSeller ? `#${r.idPicSeller}` : "—")}</div><div className="text-on-surface-variant">{r.picCodBeli?.namaPegawai ?? (r.idPicCodBeli ? `#${r.idPicCodBeli}` : "")}</div></div>;
    return <span className="text-on-surface-variant">—</span>;
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight leading-none">Pembelian</h1>
          <p className="text-sm text-on-surface-variant mt-2">Pembelian unit HP via <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/pembelian</code>. Setiap pembelian otomatis buat unit baru.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm self-start md:self-auto"><span className="material-symbols-outlined text-[18px]">add_shopping_cart</span> Catat Pembelian</button>
      </div>
      {toast && <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}><span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>{toast.msg}</div>}

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]"><span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari IMEI, model, aktivitas..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
          <div className="flex items-center gap-2 text-xs"><span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" />{filtered.length} hasil</span><button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button></div>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-start sm:items-center p-3 rounded-lg bg-surface-container border border-outline-variant/30 mt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant flex items-center gap-1.5 shrink-0">
            <span className="material-symbols-outlined text-[16px]">calendar_month</span> Periode:
          </span>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
            <select 
              value={periodeMode} 
              onChange={(e) => setPeriodeMode(e.target.value as never)} 
              className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto"
            >
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
              {q ? `Tidak ada hasil "${q}"` : "Belum ada pembelian."}
            </div>
          ) : (
            filtered.map((r) => (
              <div 
                key={r.idPembelian} 
                className="p-4 hover:bg-surface-container-low transition cursor-pointer space-y-3"
                onClick={() => getPembelianById(r.idPembelian).then(setDetail).catch(() => setDetail(r))}
              >
                <div className="flex justify-between items-center">
                  <span className="font-mono text-xs text-on-surface-variant font-medium">#{r.idPembelian}</span>
                  <span className="text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-sm border border-outline-variant/30">{fmtTgl(r.tanggalMasuk)}</span>
                </div>
                <div>
                  <h4 className="font-semibold text-on-surface text-base leading-snug">
                    {r.unitHp?.model?.namaModel ?? "—"}
                    {r.unitHp?.kapasitasGb && <span className="text-on-surface-variant font-normal"> • {r.unitHp.kapasitasGb}GB</span>}
                  </h4>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/15">{r.imei5}</span>
                    <span className="font-mono text-sm font-bold text-primary">{fmtHarga(r.hargaBeli)}</span>
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
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[90px]">ID</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[120px]">IMEI5</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Model</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[110px]">Tanggal</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[140px] text-right">Harga Beli</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase">Aktivitas</th>
                <th className="py-3 px-4 text-xs font-semibold uppercase w-[80px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <span className="inline-flex items-center gap-2 text-on-surface-variant">
                      <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
                      Memuat...
                    </span>
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="text-error text-sm font-medium">{err}</div>
                    <button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-on-surface-variant text-sm">
                    {q ? `Tidak ada hasil "${q}"` : "Belum ada pembelian."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr 
                    key={r.idPembelian} 
                    className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0 cursor-pointer" 
                    onClick={() => getPembelianById(r.idPembelian).then(setDetail).catch(() => setDetail(r))}
                  >
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{r.idPembelian}</td>
                    <td className="py-3 px-4 font-mono text-xs font-semibold text-primary">{r.imei5}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium">{r.unitHp?.model?.namaModel ?? "—"}</span>
                      {r.unitHp?.kapasitasGb && <span className="text-on-surface-variant"> • {r.unitHp.kapasitasGb}GB</span>}
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant">{fmtTgl(r.tanggalMasuk)}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-primary">{fmtHarga(r.hargaBeli)}</td>
                    <td className="py-3 px-4">{renderAktivitasCell(r)}</td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => getPembelianById(r.idPembelian).then(setDetail)} className="w-8 h-8 grid place-items-center rounded-sm border border-outline-variant hover:bg-surface-container">
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
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 text-xs text-on-surface-variant">{filtered.length} data</div>
      </div>

      {detail && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-on-background/30" onClick={() => setDetail(null)} />
          <div className="relative w-full max-w-[480px] bg-surface-container-lowest border-l border-outline-variant/30 shadow-modal overflow-y-auto">
            <div className="h-1 w-full bg-primary" /><div className="p-6">
              <div className="flex items-start justify-between"><h3 className="text-lg font-semibold">Pembelian #{detail.idPembelian}</h3><button onClick={() => setDetail(null)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
              <div className="mt-4 space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3"><div><div className="text-xs text-on-surface-variant">IMEI5</div><div className="font-mono font-semibold text-primary">{detail.imei5}</div></div><div><div className="text-xs text-on-surface-variant">Tanggal</div><div>{fmtTgl(detail.tanggalMasuk)}</div></div><div><div className="text-xs text-on-surface-variant">Model</div><div className="font-medium">{detail.unitHp?.model?.namaModel ?? "—"}</div></div><div><div className="text-xs text-on-surface-variant">Harga</div><div className="font-mono font-semibold text-primary">{fmtHarga(detail.hargaBeli)}</div></div></div>
                {detail.unitHp && (
                  <div><div className="text-xs text-on-surface-variant mb-1">Unit</div><div className="p-3 rounded-lg bg-surface-container border border-outline-variant/20"><div className="font-medium">{detail.unitHp.model?.namaModel}</div><div className="font-mono text-xs text-primary">{detail.unitHp.imei5}</div></div></div>
                )}
                <div><div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Aktivitas</div>{detail.aktivitas && detail.aktivitas.length ? <div className="space-y-2">{detail.aktivitas.map((a) => <div key={a.idAktivitas} className="flex items-center justify-between p-2 rounded-lg bg-surface-container border border-outline-variant/30"><span className="font-medium">{a.aktivitas.namaAktivitas} <span className="font-mono text-xs text-primary">{parseFloat(a.aktivitas.persentase).toFixed(2)}%</span></span><span className="text-xs">{a.pegawai.namaPegawai}</span></div>)}</div> : <div className="text-xs text-on-surface-variant">—</div>}</div>
                {detail.komisi && detail.komisi.length > 0 && <div><div className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant mb-2">Komisi</div><table className="w-full text-xs border-collapse border border-outline-variant/30 rounded-lg overflow-hidden"><thead><tr className="bg-surface-bright"><th className="py-2 px-3 text-left">Aktivitas</th><th className="py-2 px-3 text-left">Pegawai</th><th className="py-2 px-3 text-right">Nominal</th></tr></thead><tbody>{detail.komisi.map((k) => <tr key={k.idKomisi} className="border-t border-outline-variant/20"><td className="py-2 px-3">{k.aktivitas.namaAktivitas}</td><td className="py-2 px-3">{k.pegawai.namaPegawai}</td><td className="py-2 px-3 text-right font-mono font-semibold text-primary">{fmtHarga(k.nominalKomisi)}</td></tr>)}</tbody></table></div>}
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
              <div className="flex items-start justify-between gap-4 mb-1"><div><h2 className="text-lg font-semibold">Catat Pembelian</h2><p className="text-xs text-on-surface-variant mt-1">Setiap pembelian buat unit baru (status Ready)</p></div><button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
              {formErr && <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container"><span className="material-symbols-outlined text-[18px] mt-0.5">error</span><span>{formErr}</span></div>}
              {aktivitasMaster.length === 0 && <div className="mt-4 px-3 py-2.5 rounded-lg border border-secondary-container/30 bg-secondary-container/10 text-xs text-secondary">Belum ada aktivitas aktif — buat dulu di <a href="/admin/aktivitas" className="underline">Aktivitas</a>.</div>}
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><label className="text-sm font-medium">IMEI5 <span className="text-error">*</span></label><input value={form.imei5} onChange={(e) => setForm((s) => ({ ...s, imei5: e.target.value }))} maxLength={10} placeholder="Ketik IMEI baru" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Model <span className="text-error">*</span></label><select value={form.idModel} onChange={(e) => setForm((s) => ({ ...s, idModel: Number(e.target.value) }))} className="w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm"><option value={0}>— pilih model —</option>{katalogList.map((m) => <option key={m.idModel} value={m.idModel}>{m.namaModel}</option>)}</select></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Tanggal Masuk <span className="text-error">*</span></label><input type="date" value={form.tanggalMasuk} onChange={(e) => setForm((s) => ({ ...s, tanggalMasuk: e.target.value }))} className="w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Harga Beli <span className="text-error">*</span></label><input inputMode="decimal" value={form.hargaBeli} onChange={(e) => setForm((s) => ({ ...s, hargaBeli: e.target.value }))} placeholder="3500000" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Kapasitas GB</label><input inputMode="numeric" value={form.kapasitasGb} onChange={(e) => setForm((s) => ({ ...s, kapasitasGb: e.target.value }))} placeholder="128" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Warna</label><input value={form.warna} onChange={(e) => setForm((s) => ({ ...s, warna: e.target.value }))} maxLength={30} placeholder="Hitam" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Region Garansi</label><input value={form.regionGaransi} onChange={(e) => setForm((s) => ({ ...s, regionGaransi: e.target.value }))} maxLength={20} placeholder="Inter" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                  <div className="space-y-1.5"><label className="text-sm font-medium">Battery Health</label><input inputMode="numeric" value={form.batteryHealth} onChange={(e) => setForm((s) => ({ ...s, batteryHealth: e.target.value }))} placeholder="95" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
                </div>
                <div className="space-y-1.5"><label className="text-sm font-medium">Keterangan</label><textarea value={form.keteranganKondisi} onChange={(e) => setForm((s) => ({ ...s, keteranganKondisi: e.target.value }))} rows={2} placeholder="Mulus 95%" className="input-focus w-full px-3 py-2 rounded-sm border border-outline-variant bg-surface-bright text-sm resize-none" /></div>
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
                {form.hargaBeli && Number(form.hargaBeli) > 0 && aktivitasRows.some((r) => r.idAktivitas) && (
                  <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs">
                    Preview komisi: {aktivitasRows.filter((r) => r.idAktivitas).map((r) => {
                      const a = aktivitasMaster.find((x) => x.idAktivitas === r.idAktivitas);
                      const pct = a ? parseFloat(a.persentase) : 0;
                      const nom = Number(form.hargaBeli) * pct / 100;
                      return `${a?.namaAktivitas ?? r.idAktivitas} ${pct.toFixed(2)}% = ${fmtHarga(nom.toString())}`;
                    }).join(" • ")}
                  </div>
                )}
              </div>
              <div className="mt-6 flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button><button type="submit" disabled={submitting} className="h-10 px-5 rounded-sm bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60 flex items-center gap-2">{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Simpan</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
