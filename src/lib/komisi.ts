import { apiFetch } from "./api";

export type Komisi = {
  idKomisi: number;
  idPembelian?: number | null;
  idPenjualan?: number | null;
  idPegawai: number;
  idAktivitas?: number;
  peranTugas?: string;
  persentaseBerlaku: string;
  nominalKomisi: string;
  createdAt?: string | null;
  pegawai?: { idPegawai: number; namaPegawai: string };
  aktivitas?: { idAktivitas: number; namaAktivitas: string; persentase: string };
  penjualan?: { idPenjualan: number; tanggalKeluar?: string; unitHp?: { imei5: string; model?: { namaModel: string } } };
  pembelian?: { idPembelian: number; tanggalMasuk?: string; imei5: string; unitHp?: { imei5: string; model?: { namaModel: string } } };
};

export type KomisiSummary = {
  totalKomisi: string;
  totalTransaksi: number;
  perPegawai: { idPegawai: number; namaPegawai: string; total: string; count: number }[];
  perAktivitas?: { idAktivitas: number; namaAktivitas: string; total: string; count: number }[];
  perPeran: { peranTugas: string; total: string; count: number }[]; // alias for perAktivitas compat
};

export type KomisiQuery = {
  periode?: string; // YYYY-MM e.g. 2026-08
  bulan?: string | number; month?: string | number;
  tahun?: string | number; year?: string | number;
  tanggal?: string; // YYYY-MM-DD
  startDate?: string; endDate?: string;
  start?: string; end?: string; // alias
};

function withQuery(base: string, q?: KomisiQuery) {
  if (!q || Object.keys(q).length === 0) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function getKomisi(q?: KomisiQuery) {
  return apiFetch<Komisi[]>(withQuery("/api/komisi", q));
}
export function getKomisiSummary(q?: KomisiQuery) {
  return apiFetch<KomisiSummary>(withQuery("/api/komisi/summary", q));
}
export function getKomisiByPegawai(idPegawai: number, q?: KomisiQuery) {
  return apiFetch<Komisi[]>(withQuery(`/api/komisi/pegawai/${idPegawai}`, q));
}
export function getKomisiById(id: number) {
  return apiFetch<Komisi>(`/api/komisi/${id}`);
}
