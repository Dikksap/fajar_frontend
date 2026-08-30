import { apiFetch } from "./api";

export type Pegawai = {
  idPegawai: number;
  namaPegawai: string;
};

export function getPegawai() {
  return apiFetch<Pegawai[]>("/pegawai");
}

export function getPegawaiById(id: number) {
  return apiFetch<Pegawai>(`/pegawai/${id}`);
}

export function createPegawai(namaPegawai: string) {
  return apiFetch<Pegawai>("/pegawai", {
    method: "POST",
    body: JSON.stringify({ namaPegawai }),
  });
}

export function updatePegawai(id: number, namaPegawai: string) {
  return apiFetch<Pegawai>(`/pegawai/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ namaPegawai }),
  });
}

export function deletePegawai(id: number) {
  return apiFetch<{ message: string }>(`/pegawai/${id}`, {
    method: "DELETE",
  });
}
