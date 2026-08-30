import { apiFetch } from "./api";

export type Cashflow = {
  idCashflow: number;
  tanggal: string;
  tipe: "Pemasukan" | "Pengeluaran";
  nominal: number;
  keterangan: string | null;
  idPembelian: number | null;
  idPenjualan: number | null;
  idKomisi: number | null;
  createdAt: string;
  updatedAt: string;
  pembelian?: { idPembelian: number; tanggalMasuk?: string; imei5?: string };
  penjualan?: { idPenjualan: number; tanggalKeluar?: string; imei5?: string };
  komisi?: { idKomisi: number };
};

export type CashflowQuery = {
  tipe?: string;
  periode?: string;
  bulan?: string | number;
  tahun?: string | number;
  month?: string | number;
  year?: string | number;
  tanggal?: string;
  startDate?: string;
  endDate?: string;
};

function withQuery(base: string, q?: CashflowQuery) {
  if (!q || Object.keys(q).length === 0) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function getCashflow(q?: CashflowQuery) {
  return apiFetch<Cashflow[]>(withQuery("/api/cashflow", q));
}

export function getCashflowById(id: number) {
  return apiFetch<Cashflow>(`/api/cashflow/${id}`);
}

export function createCashflow(payload: CreateCashflowDto) {
  return apiFetch<Cashflow>("/api/cashflow", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateCashflow(id: number, payload: Partial<UpdateCashflowDto>) {
  return apiFetch<Cashflow>(`/api/cashflow/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteCashflow(id: number) {
  return apiFetch<{ message: string }>(`/api/cashflow/${id}`, {
    method: "DELETE",
  });
}

export type CreateCashflowDto = {
  tanggal: string;
  tipe: "Pemasukan" | "Pengeluaran";
  nominal: number;
  keterangan?: string;
  idPembelian?: number;
  idPenjualan?: number;
  idKomisi?: number;
};

export type UpdateCashflowDto = {
  tanggal?: string;
  tipe?: "Pemasukan" | "Pengeluaran";
  nominal?: number;
  keterangan?: string;
};
