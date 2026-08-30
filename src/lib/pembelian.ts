import { apiFetch } from "./api";

export type AktivitasLink = { idAktivitas: number; idPegawai: number };

export type Pembelian = {
  idPembelian: number;
  imei5: string;
  tanggalMasuk: string;
  hargaBeli: string;
  // deprecated fields (backward compat) — now via aktivitas array
  idPicSeller?: number;
  idPicCodBeli?: number;
  unitHp?: { imei5: string; kapasitasGb?: number | null; model?: { idModel: number; namaModel: string } };
  picSeller?: { idPegawai: number; namaPegawai: string };
  picCodBeli?: { idPegawai: number; namaPegawai: string };
  // baru: relasi dinamis
  aktivitas?: { idAktivitas: number; idPegawai: number; aktivitas: { idAktivitas: number; namaAktivitas: string; persentase: string }; pegawai: { idPegawai: number; namaPegawai: string } }[];
  komisi?: { idKomisi: number; idAktivitas: number; nominalKomisi: string; pegawai: { namaPegawai: string }; aktivitas: { namaAktivitas: string; persentase: string } }[];
};

export type PembelianQuery = {
  periode?: string;
  bulan?: string | number; month?: string | number;
  tahun?: string | number; year?: string | number;
  tanggal?: string;
  startDate?: string; endDate?: string;
};

function withQueryPembelian(base: string, q?: PembelianQuery) {
  if (!q || Object.keys(q).length === 0) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) if (v !== undefined && v !== null && String(v).trim() !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function getPembelian(q?: PembelianQuery) {
  return apiFetch<Pembelian[]>(withQueryPembelian("/pembelian", q));
}
export function getPembelianById(id: number) {
  return apiFetch<Pembelian>(`/pembelian/${id}`);
}
export function createPembelian(payload: {
  imei5: string;
  tanggalMasuk: string;
  hargaBeli: number;
  aktivitas?: AktivitasLink[];
  // deprecated — still accepted by backend for compat
  idPicSeller?: number;
  idPicCodBeli?: number;
}) {
  return apiFetch<Pembelian>("/pembelian", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
