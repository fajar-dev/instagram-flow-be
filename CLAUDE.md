# IG Flow — Aturan proyek backend

Backend IG Flow menyediakan API dan worker konten AMTI. Baca [panduan kontribusi](docs/AI_AGENT_RULES.md) dan [arsitektur](docs/ARCHITECTURE.md) sebelum perubahan implementasi. AGENTS.md dan CLAUDE.md harus tetap identik.

## Stack dan sumber acuan

Bun, Hono, TypeORM/MySQL (mysql2), Zod, JWT hono/jwt, Nodemailer, MinIO dan Sharp. AI dijalankan oleh n8n melalui gateway OpenAI-compatible. Versi dependency mengikuti package.json dan bun.lock. Referensi CRUD aktif adalah src/modules/user; referensi autentikasi adalah src/modules/auth.

## Arsitektur wajib

- Controller → Service → Repository melalui interface. Query/TypeORM dan transaksi berada di repository; jangan import AppDataSource ke service.
- Wiring dependency berada di *.module.ts. Jangan instantiate service/repository di controller.
- Semua endpoint berada di src/routes/api.ts; index.ts memasang middleware dan startup/error handling.
- Environment hanya dibaca parser src/config/config.ts untuk runtime aplikasi.
- Body JSON memakai Zod dan c.req.valid; query memakai validator bersama. Gunakan exception aplikasi, ApiResponse dan serializer, bukan response ad hoc atau entity sensitif mentah.
- Gunakan logger; jangan mencetak credential, password, reset token atau signed URL. Pesan source English, terjemahan en/id di src/core/i18n.
- Modul per fitur; media adalah child content, workflow child ai-job. Jangan membuat modul payung social. Modul tanpa persistence tidak membutuhkan entity/migration kosong.

## Aturan produk

Semua pengguna aktif terautentikasi memiliki akses sama. Jangan menambah role/ownership permission. User/uploader/reviewer ID tetap metadata audit. JWT dan service token callback n8n tetap wajib.

Semua media persisten memakai satu bucket MinIO, termasuk avatar, original, preview, thumbnail dan render. Tidak ada fallback lokal, SVG inline di database, proxy URL umum, atau secret signing tambahan. Presigned URL menggunakan MinIO.

Alur konten adalah READY_FOR_REVIEW → PUBLISH atau REJECTED. PUBLISH adalah tahap publikasi, bukan bukti post sudah tayang; status delivery ada pada publication. Settings mempertahankan kontrol dispatcher; credential Instagram di JSON privat; credential integrasi lainnya tetap di environment. Pertahankan idempotency, claim ownership, optimistic revision dan hash review.

Reset password memakai tabel terpisah; request/resend membuat token baru. Satu reset berhasil menghapus semua token user dalam transaksi. Auth Google harus dipertahankan.

## Database dan command

Sync selalu false, termasuk test. Baseline development 19 Oktober 2026 berisi 13 migration per tabel pada src/database/migrations (1792368000000–1792368000012). Ini menggantikan baseline sebelumnya. Perubahan berikutnya menggunakan migration baru kecuali reset development diminta eksplisit. Lihat docs/DATABASE_GUIDE.md sebelum mengubah history.

Seeder satu file per seeder pada src/database/seeders; index.ts hanya koordinator, import.meta.main menjaga entrypoint CLI. Migration dan seeder memakai script package, bukan job. Worker AI menjalankan dispatch/recovery konten; worker publishing menangani publikasi Instagram.

## Kontribusi dan verifikasi

Gunakan kebab-case file, PascalCase class/interface, camelCase TS/JSON, snake_case tabel/kolom. Pertahankan gaya file yang diedit. Null mengosongkan nilai nullable; undefined tidak mengubah field. Jangan menelan error atau mengembalikan sukses sebelum I/O yang diperlukan selesai.

Untuk perubahan implementasi jalankan bun run typecheck, bun run test, bun run build. Database test harus terpisah dan disposable. Tambahkan regresi yang menguji perilaku berubah; dokumentasi-only cukup validasi fakta/link. Perbarui OpenAPI untuk kontrak API dan changelog untuk perubahan berarti. Laporkan batas pengujian eksternal.

Audit bertanggal dan PRD awal adalah arsip, bukan aturan aktif. Jangan mengambil role/menu/storage lama dari arsip. Jangan commit .env, credential export, foto pengguna atau rahasia. Perubahan deployment tidak termasuk otomatis dalam tugas dokumentasi.

## Instagram publishing — 19 Oktober 2026

Publikasi Graph API memakai Instagram Login (graph.instagram.com, Instagram User access token, tanpa Facebook Page) melalui aksi eksplisit mendukung daftar multi-account, tetapi satu project hanya boleh diposting satu kali ke satu akun, langsung/terjadwal. Credential hanya di JSON privat server (bukan database); contoh tanpa secret boleh di-commit. Ready for review hanya mempunyai keputusan Publish atau Reject. Snapshot dan jadwal berada di tabel publications (migration tabel ke-14; constraint dan normalisasi ditambahkan pada migration 15–18). Worker posts:dispatch terpisah dari jobs:dispatch. Settings menampilkan daftar akun dan kontrol dispatcher AI. Jangan mengulang publish saat hasil jaringan ambigu; lakukan rekonsiliasi container.
