import { createKatalogModel } from "./katalogModel";

export const IPHONE_MODELS = [
  "iPhone (Generasi 1)",
  "iPhone 3G",
  "iPhone 3GS",
  "iPhone 4",
  "iPhone 4s",
  "iPhone 5",
  "iPhone 5c",
  "iPhone 5s",
  "iPhone 6",
  "iPhone 6 Plus",
  "iPhone 6s",
  "iPhone 6s Plus",
  "iPhone SE (Generasi 1)",
  "iPhone 7",
  "iPhone 7 Plus",
  "iPhone 8",
  "iPhone 8 Plus",
  "iPhone X",
  "iPhone XR",
  "iPhone XS",
  "iPhone XS Max",
  "iPhone 11",
  "iPhone 11 Pro",
  "iPhone 11 Pro Max",
  "iPhone SE (Generasi 2)",
  "iPhone 12 mini",
  "iPhone 12",
  "iPhone 12 Pro",
  "iPhone 12 Pro Max",
  "iPhone 13 mini",
  "iPhone 13",
  "iPhone 13 Pro",
  "iPhone 13 Pro Max",
  "iPhone SE (Generasi 3)",
  "iPhone 14",
  "iPhone 14 Plus",
  "iPhone 14 Pro",
  "iPhone 14 Pro Max",
  "iPhone 15",
  "iPhone 15 Plus",
  "iPhone 15 Pro",
  "iPhone 15 Pro Max",
  "iPhone 16",
  "iPhone 16 Plus",
  "iPhone 16 Pro",
  "iPhone 16 Pro Max",
  "iPhone 17",
  "iPhone 17e",
  "iPhone 17 Pro",
  "iPhone 17 Pro Max",
  "iPhone Air",
] as const;

export type SeedResult = {
  total: number;
  created: number;
  skipped: number; // 409 duplikat
  failed: number;
  errors: { namaModel: string; error: string }[];
};

export async function seedKatalogModel(
  onProgress?: (idx: number, total: number, nama: string, status: "created" | "skipped" | "failed") => void,
): Promise<SeedResult> {
  let created = 0;
  let skipped = 0;
  let failed = 0;
  const errors: SeedResult["errors"] = [];

  for (let i = 0; i < IPHONE_MODELS.length; i++) {
    const namaModel = IPHONE_MODELS[i]!;
    try {
      await createKatalogModel(namaModel);
      created++;
      onProgress?.(i + 1, IPHONE_MODELS.length, namaModel, "created");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.toLowerCase().includes("sudah terdaftar") || msg.includes("409") || msg.toLowerCase().includes("conflict")) {
        skipped++;
        onProgress?.(i + 1, IPHONE_MODELS.length, namaModel, "skipped");
      } else {
        failed++;
        errors.push({ namaModel, error: msg });
        onProgress?.(i + 1, IPHONE_MODELS.length, namaModel, "failed");
      }
    }
  }

  return { total: IPHONE_MODELS.length, created, skipped, failed, errors };
}
