import { apiFetch } from "./api";

export type Aktivitas = {
  idAktivitas: number;
  namaAktivitas: string;
  persentase: string; // Decimal(5,2) string
  statusAktif: boolean;
};

// single source of truth — master_aktivitas
export function getAktivitas() {
  return apiFetch<Aktivitas[]>("/aktivitas");
}
export function getAktivitasAktif() {
  return apiFetch<Aktivitas[]>("/aktivitas/aktif");
}
export function getAktivitasById(id: number) {
  return apiFetch<Aktivitas>(`/aktivitas/${id}`);
}
export function createAktivitas(payload: { namaAktivitas: string; persentase: number; statusAktif?: boolean }) {
  return apiFetch<Aktivitas>("/aktivitas", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export function updateAktivitas(id: number, payload: Partial<{ namaAktivitas: string; persentase: number; statusAktif: boolean }>) {
  return apiFetch<Aktivitas>(`/aktivitas/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
export function nonaktifkanAktivitas(id: number) {
  return apiFetch<Aktivitas>(`/aktivitas/${id}/nonaktifkan`, { method: "PATCH" });
}
