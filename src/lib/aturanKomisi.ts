import { apiFetch } from "./api";
import type { Aktivitas } from "./aktivitas";

// DEPRECATED — endpoint /aturan-komisi sudah diganti /aktivitas (schema 20260830122530) callers should migrate to src/lib/aktivitas.ts; this file proxies to /aktivitas for backward compat.
export type AturanKomisi = Aktivitas & { idAturan: number; namaPeran: string };

function mapAktivitasToAturan(a: Aktivitas): AturanKomisi {
  return { ...a, idAturan: a.idAktivitas, namaPeran: a.namaAktivitas } as AturanKomisi;
}

export async function getAturanKomisi(): Promise<AturanKomisi[]> {
  const list = await apiFetch<Aktivitas[]>("/aktivitas");
  return list.map(mapAktivitasToAturan);
}
export async function createAturanKomisi(payload: { namaPeran: string; persentase: number; statusAktif?: boolean }): Promise<AturanKomisi> {
  const a = await apiFetch<Aktivitas>("/aktivitas", {
    method: "POST",
    body: JSON.stringify({ namaAktivitas: payload.namaPeran, persentase: payload.persentase, statusAktif: payload.statusAktif }),
  });
  return mapAktivitasToAturan(a);
}
export async function updateAturanKomisi(id: number, payload: Partial<{ namaPeran: string; persentase: number; statusAktif: boolean }>): Promise<AturanKomisi> {
  const body: Record<string, unknown> = {};
  if (payload.namaPeran !== undefined) body.namaAktivitas = payload.namaPeran;
  if (payload.persentase !== undefined) body.persentase = payload.persentase;
  if (payload.statusAktif !== undefined) body.statusAktif = payload.statusAktif;
  const a = await apiFetch<Aktivitas>(`/aktivitas/${id}`, { method: "PATCH", body: JSON.stringify(body) });
  return mapAktivitasToAturan(a);
}
