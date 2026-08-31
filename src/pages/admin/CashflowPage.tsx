import { useEffect, useState } from "react";
import { getCashflow, createCashflow, updateCashflow, deleteCashflow, type Cashflow, type CashflowQuery } from "../../lib/cashflow";
import { localDateStr } from "../../lib/utils";

function fmtIDR(n: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n));
}
function fmtRupiahInput(v: string) {
  const digits = v.replace(/[^\d]/g, "");
  return digits ? Number(digits).toLocaleString("id-ID") : "";
}
function fmtTgl(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); }
}
function fmtRelatif(iso: string) {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "—";
  const d = Date.now() - t;
  const menit = Math.floor(d / 60000);
  if (menit < 1) return "Baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 30) return `${hari} hari lalu`;
  const bulan = Math.floor(hari / 30);
  if (bulan < 12) return `${bulan} bulan lalu`;
  return `${Math.floor(bulan / 12)} tahun lalu`;
}

export default function CashflowPage() {
  const [data, setData] = useState<Cashflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [totalPemasukan, setTotalPemasukan] = useState<number>(0);
  const [totalPengeluaran, setTotalPengeluaran] = useState<number>(0);
  const [net, setNet] = useState<number>(0);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Cashflow | null>(null);
  const [formTanggal, setFormTanggal] = useState("");
  const [formTipe, setFormTipe] = useState<"Pemasukan" | "Pengeluaran">("Pemasukan");
  const [formNominal, setFormNominal] = useState("");
  const [formKeterangan, setFormKeterangan] = useState("");

  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [delTarget, setDelTarget] = useState<Cashflow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [page, setPage] = useState(1);

  const [periodeMode, setPeriodeMode] = useState<"all" | "periode" | "tanggal" | "range" | "bulanTahun">("all");
  const [periodeVal, setPeriodeVal] = useState("");
  const [tanggalVal, setTanggalVal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [bulanVal, setBulanVal] = useState("");
  const [tahunVal, setTahunVal] = useState("");

  const buildQuery = (): CashflowQuery => {
    const qy: CashflowQuery = {};
    if (periodeMode === "periode" && periodeVal) qy.periode = periodeVal;
    if (periodeMode === "tanggal" && tanggalVal) qy.tanggal = tanggalVal;
    if (periodeMode === "range" && startDate && endDate) { qy.startDate = startDate; qy.endDate = endDate; }
    if (periodeMode === "bulanTahun" && bulanVal && tahunVal) { qy.bulan = bulanVal; qy.tahun = tahunVal; }
    return qy;
  };

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const list = await getCashflow(buildQuery());
      const resolved = Array.isArray(list) ? list : [];
      setData(resolved);
      hitungSummary(resolved);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const hitungSummary = (list: Cashflow[]) => {
    const pemasukan = list.filter((c) => c.tipe === "Pemasukan").reduce((s, c) => s + Number(c.nominal), 0);
    const pengeluaran = list.filter((c) => c.tipe === "Pengeluaran").reduce((s, c) => s + Number(c.nominal), 0);
    setTotalPemasukan(pemasukan);
    setTotalPengeluaran(pengeluaran);
    setNet(pemasukan - pengeluaran);
  };

  useEffect(() => { fetchAll(); }, [periodeMode, periodeVal, tanggalVal, startDate, endDate, bulanVal, tahunVal]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = data.filter((c) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const sumber = c.idPenjualan ? `jual #${c.idPenjualan}` : c.idPembelian ? `beli #${c.idPembelian}` : c.idKomisi ? `komisi #${c.idKomisi}` : "";
    return (
      (c.keterangan?.toLowerCase().includes(s) ?? false) ||
      String(c.idCashflow).includes(s) ||
      sumber.includes(s)
    );
  });

  const pemasukanList = filtered.filter((c) => c.tipe === "Pemasukan");
  const pengeluaranList = filtered.filter((c) => c.tipe === "Pengeluaran");
  const sortedFiltered = [...filtered].sort(
    (a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return tb - ta || b.idCashflow - a.idCashflow;
    }
  );

  const PAGE_SIZE = 10;
  const totalPages = Math.max(1, Math.ceil(sortedFiltered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = sortedFiltered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [q, periodeMode, periodeVal, tanggalVal, startDate, endDate, bulanVal, tahunVal, data]);

  const openCreate = (tipe?: "Pemasukan" | "Pengeluaran") => {
    setEditing(null);
    setFormTanggal(localDateStr());
    setFormTipe(tipe ?? "Pemasukan");
    setFormNominal("");
    setFormKeterangan("");
    setFormErr(null);
    setShowForm(true);
  };
  const openEdit = (c: Cashflow) => {
    setEditing(c);
    setFormTanggal(c.tanggal.slice(0, 10));
    setFormTipe(c.tipe);
    setFormNominal(fmtRupiahInput(String(c.nominal)));
    setFormKeterangan(c.keterangan ?? "");
    setFormErr(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const vTanggal = formTanggal;
    const vTipe = formTipe;
    const vNominal = Number(String(formNominal).replace(/[^\d]/g, ""));
    const vKeterangan = formKeterangan.trim() || undefined;

    if (!vTanggal) return setFormErr("Tanggal wajib diisi.");
    if (!vNominal || vNominal < 0) return setFormErr("Nominal wajib diisi dan >= 0.");

    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updateCashflow(editing.idCashflow, { tanggal: vTanggal, tipe: vTipe, nominal: vNominal, keterangan: vKeterangan });
        setData((prev) => prev.map((x) => (x.idCashflow === editing.idCashflow ? updated : x)));
        setToast({ msg: `Cashflow #${editing.idCashflow} diperbarui`, type: "ok" });
      } else {
        const created = await createCashflow({ tanggal: vTanggal, tipe: vTipe, nominal: vNominal, keterangan: vKeterangan });
        setData((prev) => [created, ...prev]);
        setToast({ msg: `Cashflow #${created.idCashflow} dibuat`, type: "ok" });
      }
      setShowForm(false);
      fetchAll();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("409") || msg.toLowerCase().includes("sudah")) {
        setFormErr("Duplikasi: cashflow dengan referensi sama sudah ada.");
      } else {
        setFormErr(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await deleteCashflow(delTarget.idCashflow);
      setData((prev) => {
        const next = prev.filter((x) => x.idCashflow !== delTarget!.idCashflow);
        hitungSummary(next);
        return next;
      });
      setToast({ msg: `Cashflow #${delTarget.idCashflow} dihapus`, type: "ok" });
      setDelTarget(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({ msg: msg.includes("Foreign") || msg.includes("constraint") ? "Gagal hapus: cashflow dirujuk data lain (FK constraint)." : msg, type: "err" });
    } finally {
      setDeleting(false);
    }
  };

  const TableRow = ({ c }: { c: Cashflow }) => (
    <tr className="border-b border-outline-variant/20 hover:bg-surface-container-low transition group">
      <td className="py-2.5 px-4 font-mono text-xs text-on-surface-variant w-[64px]">#{c.idCashflow}</td>
      <td className="py-2.5 px-4 text-sm text-on-surface w-[100px]">{fmtTgl(c.tanggal)}</td>
      <td className="py-2.5 px-4 text-xs text-on-surface-variant w-[100px]" title={c.createdAt ? new Date(c.createdAt).toLocaleString("id-ID") : ""}>{fmtRelatif(c.createdAt)}</td>
      <td className="py-2.5 px-4 w-[120px]">
        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${c.tipe === "Pemasukan" ? "bg-primary/10 text-primary" : "bg-error/10 text-error"}`}>
          <span className="material-symbols-outlined text-[13px]">{c.tipe === "Pemasukan" ? "arrow_upward" : "arrow_downward"}</span>
          {c.tipe}
        </span>
      </td>
      <td className="py-2.5 px-4 text-sm text-on-surface max-w-[200px] truncate pr-4">{c.keterangan ?? "—"}</td>
      <td className="py-2.5 px-4 text-xs text-on-surface-variant w-[130px]">
        {c.idPenjualan ? `Jual #${c.idPenjualan}` : c.idPembelian ? `Beli #${c.idPembelian}` : c.idKomisi ? `Komisi #${c.idKomisi}` : "—"}
      </td>
      <td className="py-2.5 px-4 text-right w-[148px]">
        <span className={`font-mono font-semibold text-sm ${c.tipe === "Pemasukan" ? "text-primary" : "text-error"}`}>
          {c.tipe === "Pengeluaran" ? "-" : "+"}{fmtIDR(Number(c.nominal))}
        </span>
      </td>
      <td className="py-2.5 px-4 text-center w-[80px]">
        <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => openEdit(c)} className="w-7 h-7 grid place-items-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition" title="Edit"><span className="material-symbols-outlined text-[14px]">edit</span></button>
          <button onClick={() => setDelTarget(c)} className="w-7 h-7 grid place-items-center rounded-sm border border-error/20 text-error hover:bg-error-container transition" title="Hapus"><span className="material-symbols-outlined text-[14px]">delete</span></button>
        </div>
      </td>
    </tr>
  );

  const pageNumbers = () => {
    const nums: number[] = [];
    const maxBtn = 5;
    let start = Math.max(1, safePage - Math.floor(maxBtn / 2));
    const end = Math.min(totalPages, start + maxBtn - 1);
    start = Math.max(1, end - maxBtn + 1);
    for (let i = start; i <= end; i++) nums.push(i);
    return nums;
  };

  const renderTable = (list: Cashflow[]) => (
    <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden ambient-shadow-sm flex flex-col">
      {/* Filter terpadu (atas kartu) */}
      <div className="p-4 border-b border-outline-variant/30 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-[360px]">
          <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari keterangan atau sumber..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={periodeMode} onChange={(e) => setPeriodeMode(e.target.value as any)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm">
            <option value="all">Semua Waktu</option>
            <option value="periode">Per Bulan</option>
            <option value="tanggal">Per Tanggal</option>
            <option value="range">Rentang</option>
            <option value="bulanTahun">Bulan &amp; Tahun</option>
          </select>
          {periodeMode === "periode" && <input type="month" value={periodeVal} onChange={(e) => setPeriodeVal(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />}
          {periodeMode === "tanggal" && <input type="date" value={tanggalVal} onChange={(e) => setTanggalVal(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />}
          {periodeMode === "range" && <><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /><span className="text-on-surface-variant text-sm">—</span><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></>}
          {periodeMode === "bulanTahun" && <><input type="number" min={1} max={12} placeholder="Bulan" value={bulanVal} onChange={(e) => setBulanVal(e.target.value)} className="h-9 w-20 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /><input type="number" min={2000} max={2100} placeholder="Tahun" value={tahunVal} onChange={(e) => setTahunVal(e.target.value)} className="h-9 w-24 px-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></>}
          {periodeMode !== "all" && (
            <button onClick={() => { setPeriodeMode("all"); setPeriodeVal(""); setTanggalVal(""); setStartDate(""); setEndDate(""); setBulanVal(""); setTahunVal(""); }} className="h-9 px-3 rounded-sm border border-error/30 text-error hover:bg-error-container text-xs font-medium">Reset</button>
          )}
        </div>
      </div>

      {/* Tabel riwayat terpadu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-bright border-b border-outline-variant/50">
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant w-[64px]">ID</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant w-[110px]">Tanggal</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant w-[100px]">Waktu</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant">Keterangan</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant w-[130px]">Sumber</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant w-[130px]">Tipe</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant text-right w-[160px]">Nominal</th>
              <th className="py-2.5 px-4 text-[10px] font-semibold uppercase text-on-surface-variant text-center w-[90px]">Aksi</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {loading ? (
              <tr><td colSpan={8} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-on-surface-variant"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />Memuat...</span></td></tr>
            ) : err ? (
              <tr><td colSpan={8} className="py-10 text-center"><div className="text-error text-sm font-medium">{err}</div><button onClick={fetchAll} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="py-10 text-center text-on-surface-variant text-sm">Belum ada data.</td></tr>
            ) : (
              list.map((c) => <TableRow key={c.idCashflow} c={c} />)
            )}
          </tbody>
        </table>
      </div>

      {/* Paginasi */}
      <div className="border-t border-outline-variant/30 px-4 py-3 flex flex-col sm:flex-row gap-2 items-center justify-between text-sm text-on-surface-variant">
        <div>
          Menampilkan {sortedFiltered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedFiltered.length)} dari {sortedFiltered.length} entri
        </div>
        <div className="flex gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1} className="px-3 py-1.5 rounded-sm border border-outline-variant text-xs font-medium disabled:opacity-40 hover:bg-surface-container">Sebelumnya</button>
          {pageNumbers().map((n) => (
            <button key={n} onClick={() => setPage(n)} className={`px-3 py-1.5 rounded-sm border text-xs font-medium ${n === safePage ? "bg-primary/10 border-primary/30 text-primary" : "border-outline-variant hover:bg-surface-container"}`}>{n}</button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages} className="px-3 py-1.5 rounded-sm border border-outline-variant text-xs font-medium disabled:opacity-40 hover:bg-surface-container">Selanjutnya</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[28px] font-semibold tracking-tight text-on-surface leading-none">Cashflow</h1>
          <p className="text-sm text-on-surface-variant mt-1.5">Pemasukan &amp; pengeluaran</p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button onClick={() => openCreate("Pemasukan")} className="bg-primary text-on-primary text-sm font-medium py-2 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">add</span> Pemasukan
          </button>
          <button onClick={() => openCreate("Pengeluaran")} className="bg-error text-on-error text-sm font-medium py-2 px-4 rounded-sm hover:bg-error/90 transition flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">remove</span> Pengeluaran
          </button>
        </div>
      </div>

      {/* Summary Cards — TOP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-5">
        {/* Pemasukan */}
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 ambient-shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Total Pemasukan</p>
              <h3 className="text-2xl font-bold text-primary">{fmtIDR(totalPemasukan)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary/10 grid place-items-center text-primary">
              <span className="material-symbols-outlined text-[20px]">trending_up</span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70">Total {pemasukanList.length} transaksi masuk</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-primary" />
        </div>
        {/* Pengeluaran */}
        <div className="relative overflow-hidden bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-5 ambient-shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-on-surface-variant mb-1">Total Pengeluaran</p>
              <h3 className="text-2xl font-bold text-error">{fmtIDR(totalPengeluaran)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-error/10 grid place-items-center text-error">
              <span className="material-symbols-outlined text-[20px]">trending_down</span>
            </div>
          </div>
          <p className="text-xs text-on-surface-variant/70">Total {pengeluaranList.length} transaksi keluar</p>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-error" />
        </div>
        {/* Saldo Akhir — kartu terisi */}
        <div className="bg-primary rounded-xl p-5 flex flex-col justify-between text-on-primary shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-sm font-medium text-on-primary/80 mb-1">Saldo Akhir</p>
              <h3 className="text-2xl font-bold">{fmtIDR(net)}</h3>
            </div>
            <div className="w-10 h-10 rounded-full bg-white/15 grid place-items-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
          </div>
          <p className="text-xs text-on-primary/70">Total {filtered.length} transaksi keseluruhan</p>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}

      {/* Single Table */}
      <div className="mb-5">
        {renderTable(paged)}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]" onClick={() => !submitting && setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-[480px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className={`h-1 w-full ${formTipe === "Pemasukan" ? "bg-primary" : "bg-error"}`} />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">{editing ? `Edit ${editing.tipe}` : `Tambah ${formTipe}`}</h2>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
              </div>
              {formErr && (
                <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                  <span>{formErr}</span>
                </div>
              )}
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="cf-tanggal" className="text-sm font-medium text-on-surface block mb-1.5">Tanggal <span className="text-error">*</span></label>
                    <input id="cf-tanggal" type="date" autoFocus value={formTanggal} onChange={(e) => setFormTanggal(e.target.value)} className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
                  </div>
                  <div>
                    <label htmlFor="cf-nominal" className="text-sm font-medium text-on-surface block mb-1.5">Nominal <span className="text-error">*</span></label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm pointer-events-none">Rp</span>
                      <input id="cf-nominal" type="text" inputMode="numeric" value={formNominal} onChange={(e) => setFormNominal(fmtRupiahInput(e.target.value))} placeholder="0" className="input-focus w-full h-11 pl-10 pr-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
                    </div>
                  </div>
                </div>
                <div>
                  <label htmlFor="cf-tipe" className="text-sm font-medium text-on-surface block mb-1.5">Tipe</label>
                  <select id="cf-tipe" value={formTipe} onChange={(e) => setFormTipe(e.target.value as any)} className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm">
                    <option value="Pemasukan">Pemasukan</option>
                    <option value="Pengeluaran">Pengeluaran</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cf-keterangan" className="text-sm font-medium text-on-surface block mb-1.5">Keterangan</label>
                  <input id="cf-keterangan" type="text" value={formKeterangan} onChange={(e) => setFormKeterangan(e.target.value)} placeholder="Deskripsi transaksi..." className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
                </div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button>
                <button type="submit" disabled={submitting} className={`h-10 px-5 rounded-sm text-on-primary text-sm font-semibold hover:opacity-90 disabled:opacity-60 flex items-center gap-2 ${formTipe === "Pemasukan" ? "bg-primary" : "bg-error"}`}>
                  {submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editing ? "Simpan" : "Buat"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirm */}
      {delTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50" onClick={() => !deleting && setDelTarget(null)} />
          <div className="relative w-full max-w-[400px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-error-container grid place-items-center text-error mb-3"><span className="material-symbols-outlined">warning</span></div>
              <h3 className="text-base font-semibold text-on-surface">Hapus cashflow?</h3>
              <p className="text-sm text-on-surface-variant mt-1 leading-5">
                <span className="font-medium text-on-surface">#{delTarget.idCashflow}</span> — {delTarget.keterangan ?? "tanpa keterangan"} ({delTarget.tipe}, {fmtIDR(Number(delTarget.nominal))}) akan dihapus permanen.
              </p>
              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={() => setDelTarget(null)} disabled={deleting} className="h-10 px-4 rounded-sm border border-outline-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button>
                <button onClick={handleDelete} disabled={deleting} className="h-10 px-5 rounded-sm bg-error text-on-error text-sm font-semibold hover:bg-[#a81818] disabled:opacity-60 flex items-center gap-2">
                  {deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
