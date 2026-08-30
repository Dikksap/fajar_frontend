import { useEffect, useState } from "react";
import { createAktivitas, getAktivitas, nonaktifkanAktivitas, updateAktivitas, type Aktivitas } from "../../lib/aktivitas";

export default function AktivitasPage() {
  const [data, setData] = useState<Aktivitas[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Aktivitas | null>(null);
  const [namaAktivitas, setNamaAktivitas] = useState("");
  const [persentase, setPersentase] = useState("");
  const [statusAktif, setStatusAktif] = useState(true);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchData = async () => {
    setLoading(true); setErr(null);
    try { const res = await getAktivitas(); setData(Array.isArray(res) ? res : []); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const filtered = data.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return r.namaAktivitas.toLowerCase().includes(s) || String(r.idAktivitas).includes(s) || r.persentase.includes(s);
  });
  const distinct = [...new Set(data.map((d) => d.namaAktivitas))];
  const openCreate = () => { setEditing(null); setNamaAktivitas(""); setPersentase(""); setStatusAktif(true); setFormErr(null); setShowForm(true); };
  const openEdit = (r: Aktivitas) => { setEditing(r); setNamaAktivitas(r.namaAktivitas); setPersentase(String(parseFloat(r.persentase))); setStatusAktif(r.statusAktif); setFormErr(null); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr(null);
    const nama = namaAktivitas.trim();
    if (!nama) return setFormErr("Nama aktivitas wajib diisi.");
    if (nama.length > 50) return setFormErr("Maksimal 50 karakter.");
    const dup = data.find((x) => x.namaAktivitas.toLowerCase() === nama.toLowerCase() && (!editing || x.idAktivitas !== editing.idAktivitas));
    if (dup) return setFormErr(`Nama aktivitas "${nama}" sudah ada (#${dup.idAktivitas}) — edit saja.`);
    const num = Number(persentase);
    if (persentase.trim() === "" || Number.isNaN(num)) return setFormErr("Persentase wajib angka.");
    if (num < 0 || num > 100) return setFormErr("Persentase 0-100.");
    if (!/^\d+(\.\d{1,2})?$/.test(persentase.trim())) return setFormErr("Maks 2 desimal (contoh 10.5).");
    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updateAktivitas(editing.idAktivitas, { namaAktivitas: nama, persentase: num, statusAktif });
        setData((prev) => prev.map((x) => (x.idAktivitas === editing.idAktivitas ? updated : x)));
        setToast({ msg: `Update #${editing.idAktivitas} berhasil`, type: "ok" });
      } else {
        const created = await createAktivitas({ namaAktivitas: nama, persentase: num, statusAktif });
        setData((prev) => [created, ...prev]);
        setToast({ msg: `Aktivitas "${created.namaAktivitas}" dibuat`, type: "ok" });
      }
      setShowForm(false);
    } catch (e) { setFormErr(e instanceof Error ? e.message : String(e)); } finally { setSubmitting(false); }
  };
  const toggleAktif = async (r: Aktivitas) => {
    try {
      const updated = r.statusAktif ? await nonaktifkanAktivitas(r.idAktivitas) : await updateAktivitas(r.idAktivitas, { statusAktif: true });
      setData((prev) => prev.map((x) => (x.idAktivitas === r.idAktivitas ? updated : x)));
      setToast({ msg: `${r.namaAktivitas} ${updated.statusAktif ? "diaktifkan" : "dinonaktifkan"}`, type: "ok" });
    } catch (e) { setToast({ msg: e instanceof Error ? e.message : String(e), type: "err" }); }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight leading-none">Aktivitas (Master)</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            Single source untuk semua komisi via <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/aktivitas</code> — GET, POST, PATCH, PATCH /:id/nonaktifkan. {data.length} aktivitas.
          </p>
          <p className="text-xs text-on-surface-variant mt-1">Dinamis: <code className="font-mono">namaAktivitas unique</code> • <code className="font-mono">nominal = hargaBeli|profit × persentase/100</code> where statusAktif=true.</p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm self-start md:self-auto"><span className="material-symbols-outlined text-[18px]">add</span> Tambah Aktivitas</button>
      </div>
      {toast && <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}><span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>{toast.msg}</div>}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]"><span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama aktivitas, ID, persentase..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" /></div>
          <div className="flex items-center gap-2 text-xs"><span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil</span><button onClick={fetchData} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button></div>
        </div>
        {distinct.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5 text-xs"><span className="text-on-surface-variant py-1">Nama di DB:</span>{distinct.map((r) => <span key={r} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/15 text-primary font-mono">{r}</span>)}</div>}
      </div>
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden ambient-shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead><tr className="bg-surface-bright border-b border-outline-variant/50"><th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[90px]">ID</th><th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Nama Aktivitas</th><th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[130px]">Persentase</th><th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[130px]">Status</th><th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[140px] text-right">Aksi</th></tr></thead>
            <tbody className="text-sm">
              {loading ? <tr><td colSpan={5} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-on-surface-variant"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat...</span></td></tr>
                : err ? <tr><td colSpan={5} className="py-10 text-center"><div className="text-error text-sm font-medium">{err}</div><button onClick={fetchData} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button></td></tr>
                  : filtered.length === 0 ? <tr><td colSpan={5} className="py-10 text-center text-on-surface-variant text-sm">{q ? `Tidak ada hasil "${q}"` : "Belum ada aktivitas. Tambah dulu."}</td></tr>
                    : filtered.map((r) => (
                      <tr key={r.idAktivitas} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0">
                        <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{r.idAktivitas}</td>
                        <td className="py-3 px-4"><div className="flex items-center gap-2.5"><div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary"><span className="material-symbols-outlined text-[18px]">bolt</span></div><span className="font-medium text-on-surface">{r.namaAktivitas}</span></div></td>
                        <td className="py-3 px-4 font-mono text-sm font-semibold text-primary">{parseFloat(r.persentase).toFixed(2)}%</td>
                        <td className="py-3 px-4"><button onClick={() => toggleAktif(r)} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition ${r.statusAktif ? "bg-primary/10 text-primary border-primary/15 hover:bg-primary/15" : "bg-surface-container text-on-surface-variant border-outline-variant hover:bg-surface-container-high"}`}><span className={`w-1.5 h-1.5 rounded-full ${r.statusAktif ? "bg-primary" : "bg-outline"}`} /> {r.statusAktif ? "Aktif" : "Nonaktif"}</button></td>
                        <td className="py-3 px-4"><div className="flex justify-end"><button onClick={() => openEdit(r)} className="w-8 h-8 grid place-items-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition"><span className="material-symbols-outlined text-[18px]">edit</span></button></div></td>
                      </tr>
                    ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant"><span>Total {data.length} • GET /aktivitas • PATCH /:id/nonaktifkan</span><span className="hidden sm:inline">unique • 0-100 max 2 desimal</span></div>
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]" onClick={() => !submitting && setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-[480px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="h-1 w-full bg-primary" /><div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-1"><div><h2 className="text-lg font-semibold">{editing ? `Edit #${editing.idAktivitas}` : "Tambah Aktivitas"}</h2><p className="text-xs text-on-surface-variant mt-1">{editing ? "PATCH /aktivitas/:id" : "POST /aktivitas"} • namaAktivitas unik</p></div><button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container"><span className="material-symbols-outlined">close</span></button></div>
              {formErr && <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container"><span className="material-symbols-outlined text-[18px] mt-0.5">error</span><span>{formErr}</span></div>}
              <div className="mt-5 space-y-4">
                <div className="space-y-1.5"><label htmlFor="namaAktivitas" className="text-sm font-medium">Nama aktivitas <span className="text-error">*</span></label><input id="namaAktivitas" autoFocus value={namaAktivitas} onChange={(e) => setNamaAktivitas(e.target.value)} maxLength={50} placeholder="Pencari Barang, COD Beli..." className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" /><datalist id="aktivitas-list">{distinct.map((r) => <option key={r} value={r} />)}</datalist></div>
                <div className="space-y-1.5"><label htmlFor="persentase" className="text-sm font-medium">Persentase (%) <span className="text-error">*</span></label><input id="persentase" inputMode="decimal" value={persentase} onChange={(e) => setPersentase(e.target.value)} placeholder="10.5" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm font-mono" /></div>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-outline-variant/30 bg-surface-container cursor-pointer"><input type="checkbox" checked={statusAktif} onChange={(e) => setStatusAktif(e.target.checked)} className="w-4 h-4 accent-primary" /><span className="text-sm font-medium">Status aktif</span><span className={`ml-auto text-xs px-2 py-1 rounded-full font-bold ${statusAktif ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>{statusAktif ? "Aktif" : "Nonaktif"}</span></label>
              </div>
              <div className="mt-6 flex gap-2 justify-end"><button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button><button type="submit" disabled={submitting} className="h-10 px-5 rounded-sm bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60 flex items-center gap-2">{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{editing ? "Simpan" : "Buat"}</button></div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
