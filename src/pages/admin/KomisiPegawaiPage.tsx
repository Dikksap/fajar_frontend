import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getPegawai, type Pegawai } from "../../lib/pegawai";
import { getKomisiByPegawai, type Komisi } from "../../lib/komisi";
import { localDateStr, localMonthStr } from "../../lib/utils";

function fmtIDR(s: string) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(s));
}
function fmtTgl(iso: string) {
  try { return new Date(iso).toLocaleDateString("id-ID"); } catch { return iso.slice(0, 10); }
}

function buildStrukHTML(pegawai: Pegawai, list: Komisi[], total: number, periodeLabel: string): string {
  const rows = list
    .map(
      (k, i) => `
      <tr>
        <td style="padding:6px 0;text-align:center;border-bottom:1px dashed #ddd">${i + 1}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd">${k.idPenjualan ? `Penjualan #${k.idPenjualan}` : k.idPembelian ? `Pembelian #${k.idPembelian}` : "—"}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd">${k.aktivitas?.namaAktivitas ?? k.peranTugas ?? "—"}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd">${k.penjualan?.unitHp?.model?.namaModel ?? k.pembelian?.unitHp?.model?.namaModel ?? "—"}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right;font-weight:600;color:#059669">${k.penjualan?.profitKotor ? fmtIDR(k.penjualan.profitKotor) : "—"}</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right">${parseFloat(k.persentaseBerlaku).toFixed(2)}%</td>
        <td style="padding:6px 0;border-bottom:1px dashed #ddd;text-align:right;font-weight:700">${fmtIDR(k.nominalKomisi)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:'Courier New',monospace;background:#fff;color:#1a1a1a;padding:32px;max-width:420px;margin:0 auto;">
      <div style="text-align:center;border-bottom:2px dashed #333;padding-bottom:16px;margin-bottom:20px;">
        <h1 style="font-size:20px;letter-spacing:3px;margin:0;">STRUK KOMISI</h1>
        <p style="font-size:12px;color:#555;margin-top:4px;">LuxeInventory — Electronics Inventory</p>
      </div>
      <div style="font-size:13px;margin-bottom:20px;line-height:2;">
        <div><strong style="display:inline-block;width:100px;">Nama</strong> ${pegawai.namaPegawai}</div>
        <div><strong style="display:inline-block;width:100px;">Periode</strong> ${periodeLabel}</div>
        <div><strong style="display:inline-block;width:100px;">Tgl Cetak</strong> ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:11px;margin-top:8px;">
        <thead>
          <tr>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:left;font-size:10px;text-transform:uppercase;">#</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:left;font-size:10px;text-transform:uppercase;">Sumber</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:left;font-size:10px;text-transform:uppercase;">Aktivitas</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:left;font-size:10px;text-transform:uppercase;">Unit</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:right;font-size:10px;text-transform:uppercase;">Profit</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:right;font-size:10px;text-transform:uppercase;">%</th>
            <th style="border-bottom:2px solid #333;padding:6px 0;text-align:right;font-size:10px;text-transform:uppercase;">Komisi</th>
          </tr>
        </thead>
        <tbody>
          ${rows || '<tr><td colspan="7" style="padding:12px;text-align:center;color:#888">Tidak ada data</td></tr>'}
        </tbody>
      </table>
      <div style="margin-top:20px;border-top:2px dashed #333;padding-top:16px;font-size:15px;text-align:right;">
        Total Komisi: <strong style="font-size:20px;">${fmtIDR(String(total))}</strong>
      </div>
      <div style="margin-top:28px;text-align:center;font-size:10px;color:#888;border-top:1px dashed #ccc;padding-top:12px;">
        Dicetak pada ${new Date().toLocaleString("id-ID")} — LuxeInventory
      </div>
    </div>
  `;
}

export default function KomisiPegawaiPage() {
  const [pegawais, setPegawais] = useState<Pegawai[]>([]);
  const [komisiMap, setKomisiMap] = useState<Record<number, Komisi[]>>({});
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterMode, setFilterMode] = useState<"bulan" | "hari">("bulan");
  const [periode, setPeriode] = useState(() => localMonthStr());
  const [tanggal, setTanggal] = useState(() => localDateStr());
  const [exporting, setExporting] = useState<number | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    setLoading(true);
    setErr(null);
    try {
      const pg = await getPegawai();
      const list = Array.isArray(pg) ? pg : [];
      setPegawais(list);

      const q = filterMode === "bulan" && periode ? { periode } : filterMode === "hari" && tanggal ? { tanggal } : undefined;
      const results = await Promise.all(
        list.map((p) => getKomisiByPegawai(p.idPegawai, q).catch(() => [] as Komisi[]))
      );

      const map: Record<number, Komisi[]> = {};
      list.forEach((p, i) => { map[p.idPegawai] = Array.isArray(results[i]) ? results[i] : []; });
      setKomisiMap(map);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [filterMode, periode, tanggal]);

  const periodeLabel = filterMode === "bulan"
    ? (periode ? new Date(periode + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "Semua Periode")
    : (tanggal ? fmtTgl(tanggal) : "Semua Hari");

  const captureReceipt = async (p: Pegawai): Promise<HTMLCanvasElement | null> => {
    const list = komisiMap[p.idPegawai] ?? [];
    const total = list.reduce((s, k) => s + Number(k.nominalKomisi), 0);

    const el = receiptRef.current;
    if (!el) return null;
    el.innerHTML = buildStrukHTML(p, list, total, periodeLabel);
    el.style.display = "block";
    el.style.position = "fixed";
    el.style.left = "-9999px";
    el.style.top = "0";

    const canvas = await html2canvas(el.firstElementChild as HTMLElement, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    el.style.display = "none";
    el.innerHTML = "";
    return canvas;
  };

  const handleExportPDF = async (p: Pegawai) => {
    setExporting(p.idPegawai);
    try {
      const canvas = await captureReceipt(p);
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfW, pdfH);
      pdf.save(`Struk-Komisi-${p.namaPegawai}-${periodeLabel.replace(/\s/g, "-")}.pdf`);
    } catch (e) {
      console.error("Export PDF gagal:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleExportImage = async (p: Pegawai) => {
    setExporting(p.idPegawai);
    try {
      const canvas = await captureReceipt(p);
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Struk-Komisi-${p.namaPegawai}-${periodeLabel.replace(/\s/g, "-")}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
    } catch (e) {
      console.error("Export gambar gagal:", e);
    } finally {
      setExporting(null);
    }
  };

  const handleShareWhatsApp = async (p: Pegawai) => {
    setExporting(p.idPegawai);
    try {
      const canvas = await captureReceipt(p);
      if (!canvas) return;

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) return;

      const file = new File([blob], `Struk-Komisi-${p.namaPegawai}.png`, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: `Struk Komisi - ${p.namaPegawai}`,
          text: `Struk komisi ${p.namaPegawai} periode ${periodeLabel}`,
          files: [file],
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Struk-Komisi-${p.namaPegawai}.png`;
        a.click();
        URL.revokeObjectURL(url);
        window.open(`https://wa.me/?text=${encodeURIComponent(`Struk komisi ${p.namaPegawai} periode ${periodeLabel}. File terlampir sebagai gambar.`)}`, "_blank");
      }
    } catch (e) {
      console.error("Share gagal:", e);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <div ref={receiptRef} style={{ display: "none" }} />

      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-[30px] font-semibold tracking-tight leading-none">Komisi per Pegawai</h1>
          <p className="text-sm text-on-surface-variant mt-2">Data komisi untuk setiap pegawai dari aktivitas pembelian & penjualan.</p>
        </div>
        <button onClick={fetchAll} className="px-3 py-2 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-sm font-medium flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[16px]">refresh</span>
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 sm:p-4 mb-6 ambient-shadow-sm">
        <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 sm:items-center">
          <div className="flex rounded-sm border border-outline-variant overflow-hidden text-xs self-start">
            <button onClick={() => setFilterMode("bulan")} className={`px-3 py-2 font-medium transition ${filterMode === "bulan" ? "bg-primary text-on-primary" : "bg-surface-bright text-on-surface-variant hover:bg-surface-container"}`}>Per Bulan</button>
            <button onClick={() => setFilterMode("hari")} className={`px-3 py-2 font-medium transition ${filterMode === "hari" ? "bg-primary text-on-primary" : "bg-surface-bright text-on-surface-variant hover:bg-surface-container"}`}>Per Hari</button>
          </div>
          {filterMode === "bulan" ? (
            <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />
          ) : (
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="h-9 px-2.5 rounded-sm border border-outline-variant bg-surface-container-lowest text-sm w-full sm:w-auto" />
          )}
          <div className="flex gap-2 self-start">
            <button onClick={() => { if (filterMode === "bulan") setPeriode(localMonthStr()); else setTanggal(localDateStr()); }} className="h-9 px-3 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium whitespace-nowrap">
              {filterMode === "bulan" ? "Bulan Ini" : "Hari Ini"}
            </button>
            <button onClick={() => { if (filterMode === "bulan") setPeriode(""); else setTanggal(""); }} className="h-9 px-3 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container-lowest text-xs font-medium">
              Semua
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center">
          <span className="inline-flex items-center gap-2 text-on-surface-variant">
            <span className="w-4 h-4 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> Memuat data...
          </span>
        </div>
      ) : err ? (
        <div className="mb-6 p-4 rounded bg-error-container border border-error/20 text-on-error-container flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span className="text-sm">{err}</span>
        </div>
      ) : pegawais.length === 0 ? (
        <div className="mb-6 p-4 rounded bg-surface-container border border-outline-variant/20 text-on-surface-variant flex items-center gap-2">
          <span className="material-symbols-outlined">info</span>
          <span className="text-sm">Belum ada data pegawai.</span>
        </div>
      ) : (
        <div className="space-y-4">
          {pegawais.map((p) => {
            const list = komisiMap[p.idPegawai] ?? [];
            const total = list.reduce((s, k) => s + Number(k.nominalKomisi), 0);
            const isOpen = expandedId === p.idPegawai;
            const isExporting = exporting === p.idPegawai;
            return (
              <div key={p.idPegawai} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg overflow-hidden ambient-shadow-sm">
<div
                   onClick={() => setExpandedId(isOpen ? null : p.idPegawai)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' || e.key === ' ') {
                       e.preventDefault();
                       setExpandedId(isOpen ? null : p.idPegawai);
                     }
                   }}
                   role="button"
                   tabIndex={0}
                   className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-surface-container-low transition text-left gap-3 cursor-pointer"
                 >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary/10 border border-primary/15 grid place-items-center text-primary font-semibold text-xs sm:text-sm shrink-0">
                      {p.namaPegawai.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-on-surface truncate">{p.namaPegawai}</div>
                      <div className="text-xs text-on-surface-variant">{list.length} transaksi</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:flex items-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportPDF(p); }}
                        disabled={isExporting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary text-xs font-medium transition disabled:opacity-50"
                        title="Export PDF"
                      >
                        {isExporting ? <span className="w-3.5 h-3.5 border-2 border-outline-variant border-t-primary rounded-full animate-spin" /> : <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span>}
                        PDF
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleExportImage(p); }}
                        disabled={isExporting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container hover:text-primary text-xs font-medium transition disabled:opacity-50"
                        title="Export Gambar"
                      >
                        <span className="material-symbols-outlined text-[15px]">image</span>
                        Gambar
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleShareWhatsApp(p); }}
                        disabled={isExporting}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition disabled:opacity-50"
                        title="Share WhatsApp"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        WhatsApp
                      </button>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-on-surface-variant">Total Komisi</div>
                      <div className="font-bold text-primary">{fmtIDR(String(total))}</div>
                    </div>
<span className={`material-symbols-outlined text-[20px] text-on-surface-variant transition-transform ${isOpen ? "rotate-180" : ""}`}>expand_more</span>
                   </div>
                 </div>

                {isOpen && (
                  <div className="border-t border-outline-variant/30">
                    {list.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-on-surface-variant">Belum ada data komisi.</div>
                    ) : (
                      <>
                        <div className="flex sm:hidden gap-2 px-4 pt-3 flex-wrap">
                          <button onClick={() => handleExportPDF(p)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium transition disabled:opacity-50">
                            <span className="material-symbols-outlined text-[15px]">picture_as_pdf</span> PDF
                          </button>
                          <button onClick={() => handleExportImage(p)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-outline-variant text-on-surface-variant hover:bg-surface-container text-xs font-medium transition disabled:opacity-50">
                            <span className="material-symbols-outlined text-[15px]">image</span> Gambar
                          </button>
                          <button onClick={() => handleShareWhatsApp(p)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-medium transition disabled:opacity-50">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                            WhatsApp
                          </button>
                        </div>
                        <div className="hidden md:block">
                          <table className="w-full text-left text-sm">
                            <thead>
                              <tr className="bg-surface-container border-b border-outline-variant/30">
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant w-10">#</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant">Sumber</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant">Aktivitas</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant">Unit</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant text-right">Profit</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant text-right w-16">%</th>
                                <th className="py-2.5 px-4 text-xs font-semibold uppercase text-on-surface-variant text-right">Komisi</th>
                              </tr>
                            </thead>
                            <tbody>
                              {list.map((k, i) => (
                                <tr key={k.idKomisi} className="border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low transition">
                                  <td className="py-2.5 px-4 text-on-surface-variant">{i + 1}</td>
                                  <td className="py-2.5 px-4 text-on-surface-variant">
                                    {k.idPenjualan ? `Penjualan #${k.idPenjualan}` : k.idPembelian ? `Pembelian #${k.idPembelian}` : "—"}
                                    <div className="text-xs text-on-surface-variant/70">{k.penjualan?.tanggalKeluar ? fmtTgl(k.penjualan.tanggalKeluar) : k.pembelian?.tanggalMasuk ? fmtTgl(k.pembelian.tanggalMasuk) : ""}</div>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <span className="inline-flex px-2 py-1 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary">
                                      {k.aktivitas?.namaAktivitas ?? k.peranTugas ?? "—"}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    <div className="text-on-surface">{k.penjualan?.unitHp?.model?.namaModel ?? k.pembelian?.unitHp?.model?.namaModel ?? "—"}</div>
                                    <div className="font-mono text-xs text-primary">{k.penjualan?.unitHp?.imei5 ?? k.pembelian?.unitHp?.imei5 ?? ""}</div>
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    {k.penjualan?.profitKotor ? (
                                      <span className="font-mono font-semibold text-emerald-600">{fmtIDR(k.penjualan.profitKotor)}</span>
                                    ) : (
                                      <span className="text-on-surface-variant">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-4 text-right font-mono">{parseFloat(k.persentaseBerlaku).toFixed(2)}%</td>
                                  <td className="py-2.5 px-4 text-right font-mono font-semibold text-primary">{fmtIDR(k.nominalKomisi)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="md:hidden divide-y divide-outline-variant/20">
                          {list.map((k, i) => (
                            <div key={k.idKomisi} className="px-4 py-3 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-xs text-on-surface-variant shrink-0">{i + 1}.</span>
                                  <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-bold bg-primary/10 border border-primary/15 text-primary truncate">
                                    {k.aktivitas?.namaAktivitas ?? k.peranTugas ?? "—"}
                                  </span>
                                </div>
                                <span className="font-mono font-semibold text-primary text-sm shrink-0">{fmtIDR(k.nominalKomisi)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-on-surface-variant truncate">
                                  {k.idPenjualan ? `Penjualan #${k.idPenjualan}` : k.idPembelian ? `Pembelian #${k.idPembelian}` : "—"}
                                </span>
                                <span className="text-on-surface-variant/70 shrink-0">{k.penjualan?.tanggalKeluar ? fmtTgl(k.penjualan.tanggalKeluar) : k.pembelian?.tanggalMasuk ? fmtTgl(k.pembelian.tanggalMasuk) : ""}</span>
                              </div>
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="text-on-surface truncate">
                                  {k.penjualan?.unitHp?.model?.namaModel ?? k.pembelian?.unitHp?.model?.namaModel ?? "—"}
                                  <span className="font-mono text-primary ml-1">{k.penjualan?.unitHp?.imei5 ?? k.pembelian?.unitHp?.imei5 ?? ""}</span>
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  {k.penjualan?.profitKotor && (
                                    <span className="font-mono text-emerald-600">{fmtIDR(k.penjualan.profitKotor)}</span>
                                  )}
                                  <span className="font-mono text-on-surface-variant">{parseFloat(k.persentaseBerlaku).toFixed(2)}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}