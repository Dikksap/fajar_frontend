import { useEffect, useState } from "react";
import { createPegawai, deletePegawai, getPegawai, updatePegawai, type Pegawai } from "../../lib/pegawai";

export default function PegawaiPage() {
  const [data, setData] = useState<Pegawai[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  // modal state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Pegawai | null>(null);
  const [nama, setNama] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // delete confirm
  const [delTarget, setDelTarget] = useState<Pegawai | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await getPegawai();
      setData(Array.isArray(res) ? res : []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const filtered = data.filter((p) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return p.namaPegawai.toLowerCase().includes(s) || String(p.idPegawai).includes(s);
  });

  const openCreate = () => {
    setEditing(null);
    setNama("");
    setFormErr(null);
    setShowForm(true);
  };
  const openEdit = (p: Pegawai) => {
    setEditing(p);
    setNama(p.namaPegawai);
    setFormErr(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErr(null);
    const v = nama.trim();
    if (!v) return setFormErr("Nama pegawai wajib diisi.");
    if (v.length > 50) return setFormErr("Maksimal 50 karakter.");

    setSubmitting(true);
    try {
      if (editing) {
        const updated = await updatePegawai(editing.idPegawai, v);
        setData((prev) => prev.map((x) => (x.idPegawai === editing.idPegawai ? updated : x)));
        setToast({ msg: `Berhasil update #${editing.idPegawai}`, type: "ok" });
      } else {
        const created = await createPegawai(v);
        setData((prev) => [created, ...prev]);
        setToast({ msg: `Pegawai "${created.namaPegawai}" dibuat`, type: "ok" });
      }
      setShowForm(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // map 409 duplikat
      if (msg.toLowerCase().includes("sudah terdaftar") || msg.includes("409")) {
        setFormErr("Nama pegawai sudah terdaftar — pakai nama lain.");
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
      await deletePegawai(delTarget.idPegawai);
      setData((prev) => prev.filter((x) => x.idPegawai !== delTarget.idPegawai));
      setToast({ msg: `Hapus #${delTarget.idPegawai} berhasil`, type: "ok" });
      setDelTarget(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // FK constraint -> pesan foreign key
      setToast({ msg: msg.includes("Foreign") || msg.includes("constraint") ? "Gagal hapus: pegawai masih dipakai di Pembelian/Penjualan (FK constraint)." : msg, type: "err" });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {/* Header — match DashboardPage style */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight text-on-surface leading-none">Manajemen Pegawai</h1>
          <p className="text-sm text-on-surface-variant mt-2">
            CRUD pegawai via <code className="px-1.5 py-0.5 rounded bg-surface-container text-xs font-mono">/pegawai</code> — JWT Bearer. {data.length} data • urut id DESC.
          </p>
        </div>
        <button onClick={openCreate} className="bg-primary text-on-primary text-sm font-medium py-2.5 px-4 rounded-sm hover:bg-primary-container transition flex items-center gap-2 shadow-sm self-start md:self-auto">
          <span className="material-symbols-outlined text-[18px]">person_add</span> Tambah Pegawai
        </button>
      </div>

      {toast && (
        <div className={`mb-4 flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${toast.type === "ok" ? "bg-primary/10 border-primary/20 text-primary" : "bg-error-container border-error/20 text-on-error-container"}`}>
          <span className="material-symbols-outlined text-[18px]">{toast.type === "ok" ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-4 mb-4 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
          <div className="relative flex-1 max-w-[420px]">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px] pointer-events-none">search</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama atau ID..." className="input-focus w-full pl-9 pr-3 py-2.5 rounded-sm border border-outline-variant bg-surface-bright text-sm" />
          </div>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/30">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> {filtered.length} hasil
            </span>
            <button onClick={fetchData} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden ambient-shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[520px]">
            <thead>
              <tr className="bg-surface-bright border-b border-outline-variant/50">
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wide w-[110px]">ID</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wide">Nama Pegawai</th>
                <th className="py-3 px-4 text-xs font-semibold text-on-surface-variant uppercase tracking-wide w-[160px] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center">
                    <span className="inline-flex items-center gap-2 text-on-surface-variant">
                      <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat pegawai...
                    </span>
                  </td>
                </tr>
              ) : err ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center">
                    <div className="text-error text-sm font-medium">{err}</div>
                    <button onClick={fetchData} className="mt-2 text-primary text-sm hover:underline">Coba lagi</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-on-surface-variant text-sm">
                    {q ? `Tidak ada hasil untuk "${q}"` : "Belum ada pegawai. Klik Tambah Pegawai."}
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.idPegawai} className="border-b border-outline-variant/20 hover:bg-surface-container-low transition last:border-0">
                    <td className="py-3 px-4 font-mono text-xs text-on-surface-variant">#{p.idPegawai}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary font-semibold text-xs">
                          {p.namaPegawai.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-on-surface">{p.namaPegawai}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => openEdit(p)} className="w-8 h-8 grid place-items-center rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary transition" title="Edit">
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button onClick={() => setDelTarget(p)} className="w-8 h-8 grid place-items-center rounded-sm border border-error/20 text-error hover:bg-error-container transition" title="Hapus">
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-between text-xs text-on-surface-variant">
          <span>Total {data.length} pegawai • GET /pegawai</span>
          <span className="hidden sm:inline font-mono">unique • max 50 char • FK: PembelianHp/PenjualanHp</span>
        </div>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-on-background/50 backdrop-blur-[2px]" onClick={() => !submitting && setShowForm(false)} />
          <form onSubmit={handleSubmit} className="relative w-full max-w-[460px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="h-1 w-full bg-primary" />
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-1">
                <div>
                  <h2 className="text-lg font-semibold text-on-surface">{editing ? `Edit Pegawai #${editing.idPegawai}` : "Tambah Pegawai"}</h2>
                  <p className="text-xs text-on-surface-variant mt-1">{editing ? "PATCH /pegawai/:id" : "POST /pegawai"} • namaPegawai required, unique</p>
                </div>
                <button type="button" onClick={() => setShowForm(false)} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-surface-container text-on-surface-variant">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {formErr && (
                <div className="mt-4 flex gap-2 items-start bg-error-container border border-error/15 rounded-lg px-3 py-2.5 text-sm text-on-error-container">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                  <span>{formErr}</span>
                </div>
              )}

              <div className="mt-5 space-y-1.5">
                <label htmlFor="namaPegawai" className="text-sm font-medium text-on-surface">Nama pegawai <span className="text-error">*</span></label>
                <input
                  id="namaPegawai"
                  autoFocus
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  maxLength={50}
                  placeholder="Contoh: Budi Santoso"
                  className="input-focus w-full h-11 px-3 rounded-sm border border-outline-variant bg-surface-bright text-sm"
                />
                <div className="flex justify-between text-xs">
                  <span className="text-on-surface-variant">Max 50 karakter, unik</span>
                  <span className={nama.length > 50 ? "text-error" : "text-on-surface-variant"}>{nama.length}/50</span>
                </div>
              </div>

              <div className="mt-6 flex gap-2 justify-end">
                <button type="button" onClick={() => setShowForm(false)} disabled={submitting} className="h-10 px-4 rounded-sm border border-outline-variant text-on-surface-variant text-sm font-medium hover:bg-surface-container disabled:opacity-50">Batal</button>
                <button type="submit" disabled={submitting} className="h-10 px-5 rounded-sm bg-primary text-on-primary text-sm font-semibold hover:bg-primary-container disabled:opacity-60 flex items-center gap-2">
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
          <div className="relative w-full max-w-[420px] bg-surface-container-lowest rounded-xl border border-outline-variant/30 shadow-modal overflow-hidden">
            <div className="p-6">
              <div className="w-10 h-10 rounded-full bg-error-container grid place-items-center text-error mb-3">
                <span className="material-symbols-outlined">warning</span>
              </div>
              <h3 className="text-base font-semibold text-on-surface">Hapus pegawai?</h3>
              <p className="text-sm text-on-surface-variant mt-1 leading-5">
                <span className="font-medium text-on-surface">#{delTarget.idPegawai} — {delTarget.namaPegawai}</span> akan dihapus permanen. Jika masih dipakai di Pembelian/Penjualan akan gagal (FK).
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
