import { apiFetch } from "./api";

export type AktivitasLink = { idAktivitas: number; idPegawai: number };

export type Penjualan = {
  idPenjualan: number;
  imei5: string;
  tanggalKeluar: string;
  hargaJual: string;
  profitKotor: string;
  idPicBuyer?: number;
  idPicCodJual?: number;
  unitHp?: { imei5: string; model?: { namaModel: string }; pembelian?: { hargaBeli: string } | null };
  picBuyer?: { idPegawai: number; namaPegawai: string };
  picCodJual?: { idPegawai: number; namaPegawai: string };
  // baru dinamis
  aktivitas?: { idAktivitas: number; idPegawai: number; aktivitas: { idAktivitas: number; namaAktivitas: string; persentase: string }; pegawai: { idPegawai: number; namaPegawai: string } }[];
  komisiTransaksi?: {
    idKomisi: number;
    idPegawai: number;
    idAktivitas?: number;
    peranTugas?: string;
    persentaseBerlaku: string;
    nominalKomisi: string;
    pegawai?: { namaPegawai: string };
    aktivitas?: { idAktivitas: number; namaAktivitas: string };
  }[];
};

export function getPenjualan() {
  return apiFetch<Penjualan[]>("/api/penjualan");
}
export function getPenjualanById(id: number) {
  return apiFetch<Penjualan>(`/api/penjualan/${id}`);
}
export function createPenjualan(payload: {
  imei5: string;
  tanggalKeluar: string;
  hargaJual: number;
  profitKotor?: number;
  aktivitas?: AktivitasLink[];
  idPicBuyer?: number;
  idPicCodJual?: number;
}) {
  return apiFetch<Penjualan>("/api/penjualan", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
