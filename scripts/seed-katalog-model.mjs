#!/usr/bin/env node
// Standalone seed tanpa login manual — auto login dulu lalu POST /katalog-model satu-satu (skip 409)
// Usage:
//   node scripts/seed-katalog-model.mjs
//   node scripts/seed-katalog-model.mjs --email admin@example.com --password secret123 --api http://localhost:3000

const models = [
  "iPhone (Generasi 1)","iPhone 3G","iPhone 3GS","iPhone 4","iPhone 4s","iPhone 5","iPhone 5c","iPhone 5s",
  "iPhone 6","iPhone 6 Plus","iPhone 6s","iPhone 6s Plus","iPhone SE (Generasi 1)","iPhone 7","iPhone 7 Plus",
  "iPhone 8","iPhone 8 Plus","iPhone X","iPhone XR","iPhone XS","iPhone XS Max","iPhone 11","iPhone 11 Pro",
  "iPhone 11 Pro Max","iPhone SE (Generasi 2)","iPhone 12 mini","iPhone 12","iPhone 12 Pro","iPhone 12 Pro Max",
  "iPhone 13 mini","iPhone 13","iPhone 13 Pro","iPhone 13 Pro Max","iPhone SE (Generasi 3)","iPhone 14",
  "iPhone 14 Plus","iPhone 14 Pro","iPhone 14 Pro Max","iPhone 15","iPhone 15 Plus","iPhone 15 Pro",
  "iPhone 15 Pro Max","iPhone 16","iPhone 16 Plus","iPhone 16 Pro","iPhone 16 Pro Max","iPhone 17","iPhone 17e",
  "iPhone 17 Pro","iPhone 17 Pro Max","iPhone Air",
];

function arg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : fallback;
}
const API = (arg("--api", process.env.API_BASE_URL || "http://localhost:3000")).replace(/\/$/, "");
const EMAIL = arg("--email", process.env.SEED_EMAIL || "admin@example.com");
const PASSWORD = arg("--password", process.env.SEED_PASSWORD || "secret123");

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Login failed ${res.status}: ${t}`);
  }
  const j = await res.json();
  return j.access_token;
}

async function main() {
  console.log(`API: ${API}\nLogin: ${EMAIL}`);
  const token = await login();
  console.log("Token OK, seeding", models.length, "models...\n");
  let created = 0, skipped = 0, failed = 0;
  for (const namaModel of models) {
    const res = await fetch(`${API}/katalog-model`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ namaModel }),
    });
    if (res.status === 201) {
      created++;
      console.log(`✔ ${namaModel}`);
    } else if (res.status === 409) {
      skipped++;
      console.log(`○ skip (duplikat) ${namaModel}`);
    } else {
      failed++;
      const t = await res.text();
      console.log(`✘ ${namaModel} -> ${res.status} ${t}`);
    }
  }
  console.log(`\nDone: ${created} created, ${skipped} skipped, ${failed} failed / ${models.length} total`);
}
main().catch((e) => { console.error(e); process.exit(1); });
