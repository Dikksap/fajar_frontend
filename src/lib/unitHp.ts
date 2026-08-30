import { apiFetch } from "./api";

export type StatusStok = "Tersedia" | "Terjual" | "Retur";

export type UnitHp = {
  imei5: string;
  idModel: number;
  kapasitasGb: number | null;
  warna: string | null;
  regionGaransi: string | null;
  batteryHealth: number | null;
  keteranganKondisi: string | null;
  statusStok: StatusStok;
  model?: { idModel: number; namaModel: string };
  pembelian?: unknown | null;
  penjualan?: unknown | null;
};

export type UnitHpCreate = {
  imei5: string;
  idModel: number;
  kapasitasGb?: number;
  warna?: string;
  regionGaransi?: string;
  batteryHealth?: number;
  keteranganKondisi?: string;
  statusStok?: StatusStok;
};

export type UnitHpUpdate = Partial<Omit<UnitHpCreate, "imei5"> & { idModel: number }>;

export function getUnitHp() {
  return apiFetch<UnitHp[]>("/unit-hp");
}
export function getUnitHpById(imei5: string) {
  return apiFetch<UnitHp>(`/unit-hp/${encodeURIComponent(imei5)}`);
}
export function createUnitHp(payload: UnitHpCreate) {
  return apiFetch<UnitHp>("/unit-hp", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateUnitHp(imei5: string, payload: UnitHpUpdate) {
  return apiFetch<UnitHp>(`/unit-hp/${encodeURIComponent(imei5)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
