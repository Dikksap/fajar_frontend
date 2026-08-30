import { useEffect, useState } from "react";
import { createKatalogModel, deleteKatalogModel, getKatalogModel, updateKatalogModel, type KatalogModel } from "../../lib/katalogModel";
import { IPHONE_MODELS, seedKatalogModel } from "../../lib/seedKatalogModel";

export default function KatalogModelPage() {
  const [data, setData] = useState<KatalogModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<KatalogModel | null>(null);
  const [nama, setNama] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [delTarget, setDelTarget] = useState<KatalogModel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedProgress, setSeedProgress] = useState<{ done: number; total: number; last: string } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await getKatalogModel();
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = data.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.namaModel.toLowerCase().includes(s) || String(p.idModel).includes(s);
  });

  const openCreate = () => { setEditing(null); setNama(""); setFormErr(null); setShowForm(true); };
  const openEdit = (p: KatalogModel) => { setEditing(p); setNama(p.namaModel); setFormErr(null); setShowForm(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const v = nama.trim();
    if (!v) return setFormErr("Nama model wajib diisi.");
    if (v.length > 50) return setFormErr("Maksimal 50 karakter.");
    setSubmitting(true);
    try {
      if (editing) {
        const u = await updateKatalogModel(editing.idModel, v);
        setData((prev) => prev.map((x) => (x.idModel === editing.idModel ? u : x)));
        setToast({ msg: `Update #${editing.idModel} berhasil`, type: "ok" });
      } else {
        const c = await createKatalogModel(v);
        setData((prev) => [c, ...prev]);
        setToast({ msg: `Model "${c.namaModel}" dibuat`, type: "ok" });
      }
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("sudah terdaftar") || msg.includes("409")) setFormErr("Nama model sudah terdaftar — pakai nama lain.");
      else setFormErr(msg);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await deleteKatalogModel(delTarget.idModel);
      setData((prev) => prev.filter((x) => x.idModel !== delTarget.idModel));
      setToast({ msg: `Hapus #${delTarget.idModel} berhasil`, type: "ok" });
      setDelTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setToast({ msg: msg.includes("Foreign") || msg.includes("constraint") ? "Gagal hapus: model masih dipakai UnitHp (FK constraint)." : msg, type: "err" });
    } finally { setDeleting(false); }
  };

  const handleSeed = async () => {
    if (seeding) return;
    if (!confirm(`Seed ${IPHONE_MODELS.length} model iPhone? Duplikat akan di-skip (409).`)) return;
    setSeeding(true);
    setSeedProgress({ done: 0, total: IPHONE_MODELS.length, last: "" });
    try {
      const res = await seedKatalogModel((done, total, nama, status) => {
        setSeedProgress({ done, total, last: `${status === "created" ? "✔" : status === "skipped" ? "○" : "✘"} ${nama}` });
      });
      await fetchData();
      setToast({ msg: `Seed selesai: ${res.created} baru, ${res.skipped} sudah ada, ${res.failed} gagal / ${res.total}`, type: res.failed ? "err" : "ok" });
      if (res.errors.length) console.warn(res.errors);
    } catch (e) {
      setToast({ msg: e instanceof Error ? e.message : String(e), type: "err" });
    } finally {
      setSeeding(false);
      setSeedProgress(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight text-on-surface leading-none">Katalog Model</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            CRUD via <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/katalog-model</code> — JWT Bearer. {data.length} data • id DESC.
          </p>
        </div>
        <div className="flex gap-2 self-start md:self-auto">
          <button onClick={handleSeed} disabled={seeding} className="bg-surface-container-lowest border border-primary text-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-surface-container transition flex items-center gap-2 disabled:opacity-50">
            {seeding ? <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[18px]">auto_fix_high</span>}
            {seeding ? `Seeding ${seedProgress?.done}/${seedProgress?.total}` : `Seed ${IPHONE_MODELS.length} iPhone`}
          </button>
          <button onClick={openCreate} className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm">
            <span className="material-symbols-outlined text-[18px]">add</span> Tambah
          </button>
        </div>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>{toast.msg}
        </div>
      )}
      {seeding && seedProgress && (
        <div className="mb-4 px-4 py-3 rounded-lg border border-outline-variant/30 bg-surface-container text-sm flex items-center gap-3">
          <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" />
          <span className="text-on-surface-variant">Seeding {seedProgress.done}/{seedProgress.total}</span>
          <span className="text-on-surface font-mono text-xs truncate">{seedProgress.last}</span>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama model atau ID..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil</span>
            <button onClick={fetchData} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">refresh</span> Refresh</button>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden ambient-shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant/50">
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[110px]">ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase">Nama Model</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase w-[160px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr><td colSpan={3} className="py-10 text-center"><span className="inline-flex items-center gap-2 text-on-surface-variant"><span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat...</span></td></tr>
              ) : err ? (
                <tr><td colSpan={3} className="py-10 text-center"><div className="text-error text-sm font-medium">{err}</div><button onClick={fetchData} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={3} className="py-10 text-center text-on-surface-variant text-sm">{q ? `Tidak ada hasil untuk "${q}"` : "Belum ada model."}</td></tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.idModel} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0">
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{p.idModel}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary"><span className="material-symbols-outlined text-[18px]">smartphone</span></div>
                        <span className="font-medium text-on-surface">{p.namaModel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4"><div className="flex justify-end gap-1.5">
                      <button onClick={() => openEdit(p)} className="w-8 h-8 grid place-items-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                      <button onClick={() => setDelTarget(p)} className="w-8 h-8 grid place-items-center rounded-sm border border-error/20 text-error hover:bg-error-container transition"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                    </div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
          <span>Total {data.length} model • GET /katalog-model</span>
          <span className="hidden sm:inline font-mono">unique • max 50 • FK: UnitHp</span>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]" onClick={() => !submitting && setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-[460px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="h-1 w-full bg-primary" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div><h2 className="text-lg font-semibold text-on-surface">{editing ? `Edit #${editing.idModel}` : "Tambah Model"}</h2><p className="text-xs text-on-surface-variant mt-1">{editing ? "PATCH /katalog-model/:id" : "POST /katalog-model"} • namaModel required, unique</p></div>
                <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container text-on-surface-variant"><span className="material-symbols-outlined">close</span></button>
              </div>
              {formErr && <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container"><span className="material-symbols-outlined text-[18px] mt-0.5">error</span><span>{formErr}</span></div>}
              <div className="mt-5 space-y-1.5">
                <label htmlFor="namaModel" className="text-sm font-medium text-on-surface">Nama model <span className="text-error">*</span></label>
                <input id="namaModel" autoFocus value={nama} onChange={(e) => setNama(e.target.value)} maxLength={50} placeholder="Contoh: iPhone 15 Pro" className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
                <div className="flex justify-between text-xs"><span className="text-on-surface-variant">Max 50, unik</span><span className={nama.length>50?"text-error":"text-on-surface-variant"}>{nama.length}/50</span></div>
              </div>
              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-sm bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60 flex items-center gap-2">{submitting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}{editing ? "Simpan" : "Buat"}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {delTarget && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50" onClick={() => !deleting && setDelTarget(null)} />
          <div className="relative w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-error-container grid place-items-center text-error mb-3"><span className="material-symbols-outlined">warning</span></div>
              <h3 className="text-base font-semibold text-on-surface">Hapus model?</h3>
              <p className="text-sm text-on-surface-variant mt-1 leading-5"><span className="font-medium text-on-surface">#{delTarget.idModel} — {delTarget.namaModel}</span> akan dihapus. Gagal jika masih dipakai UnitHp (FK).</p>
              <div className="mt-6 flex gap-2 justify-end">
                <button onClick={() => setDelTarget(null)} disabled={deleting} className="h-10 px-4 rounded-sm border border-outline-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button>
                <button onClick={handleDelete} disabled={deleting} className="h-10 px-5 rounded-sm bg-error text-on-error text-sm font-semibold hover:bg-[#a81818] disabled:opacity-60 flex items-center gap-2">{deleting && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}Hapus</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
