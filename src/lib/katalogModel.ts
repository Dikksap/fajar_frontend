import { apiFetch } from "./api";

export type KatalogModel = {
  idModel: number;
  namaModel: string;
};

export function getKatalogModel() {
  return apiFetch<KatalogModel[]>("/katalog-model");
}
export function createKatalogModel(namaModel: string) {
  return apiFetch<KatalogModel>("/katalog-model", {
    method: "POST",
    body: JSON.stringify({ namaModel }),
  });
}
export function updateKatalogModel(id: number, namaModel: string) {
  return apiFetch<KatalogModel>(`/katalog-model/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ namaModel }),
  });
}
export function deleteKatalogModel(id: number) {
  return apiFetch<{ message: string }>(`/katalog-model/${id}`, { method: "DELETE" });
}
