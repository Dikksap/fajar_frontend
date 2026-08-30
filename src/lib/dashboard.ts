import { apiFetch } from "./api";

// GET /dashboard → view_dashboard single object id=1
export type DashboardSummary = {
  id: number;
  totalUnit: number;
  stokTersedia: number;
  stokTerjual: number;
  stokRetur: number;
  totalPembelian: number;
  totalHargaBeli: string; // numeric string
  totalPenjualan: number;
  totalHargaJual: string;
  totalProfitKotor: string;
  totalKomisiPembelian: string;
  totalKomisiPenjualan: string;
  totalKomisi: string;
  profitBersihPenjualan: string;
};

// GET /dashboard/penjualan-bulanan
export type DashboardPenjualanBulanan = {
  periode: string; // date or string
  tahun: number;
  bulan: number;
  periodeLabel: string; // YYYY-MM
  totalTransaksi: number;
  totalHargaJual: string;
  totalProfitKotor: string;
  totalKomisi: string;
  profitBersih: string;
};

// GET /dashboard/pembelian-bulanan
export type DashboardPembelianBulanan = {
  periode: string;
  tahun: number;
  bulan: number;
  periodeLabel: string;
  totalTransaksi: number;
  totalHargaBeli: string;
  totalKomisi: string;
};

// GET /dashboard/profit-bulanan
export type DashboardProfitBulanan = {
  periode: string;
  tahun: number;
  bulan: number;
  periodeLabel: string;
  totalPenjualan: number;
  totalHargaJual: string;
  totalProfitKotor: string;
  totalKomisiPenjualan: string;
  profitBersih: string;
};

export type DashboardBulananQuery = {
  periode?: string; // YYYY-MM e.g. 2026-08
  bulan?: string | number; month?: string | number;
  tahun?: string | number; year?: string | number;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;
  start?: string; end?: string; // alias compat
};

function withQuery(base: string, q?: DashboardBulananQuery) {
  if (!q || Object.keys(q).length === 0) return base;
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `${base}?${s}` : base;
}

export function getDashboard() {
  return apiFetch<DashboardSummary>("/dashboard");
}

export function getDashboardPenjualanBulanan(q?: DashboardBulananQuery) {
  return apiFetch<DashboardPenjualanBulanan[]>(withQuery("/dashboard/penjualan-bulanan", q));
}

export function getDashboardPembelianBulanan(q?: DashboardBulananQuery) {
  return apiFetch<DashboardPembelianBulanan[]>(withQuery("/dashboard/pembelian-bulanan", q));
}

export function getDashboardProfitBulanan(q?: DashboardBulananQuery) {
  return apiFetch<DashboardProfitBulanan[]>(withQuery("/dashboard/profit-bulanan", q));
}
