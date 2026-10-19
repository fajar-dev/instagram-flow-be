# IG Flow — Backend

API dan worker untuk IG Flow, dashboard AMTI (Asset Monitoring Teknologi Indonesia) untuk menyiapkan konten Instagram dari dokumentasi kegiatan. Backend mengelola unggahan, proses AI melalui n8n, hasil render, revisi, dan review internal.

## Cakupan saat ini

- Login email/password dan Google, profil, reset password, dan pengelolaan pengguna.
- Batch foto dengan metadata kegiatan, validasi gambar per file, preview aman, dan penyimpanan privat MinIO.
- Job AI dengan outbox, claim execution, retry, watchdog, serta callback hasil/failure dari n8n.
- Caption, pemilihan foto, preview feed/story, revisi, dan keputusan review dengan pemeriksaan revisi aktif.
- Overview, media library, audit log, dan kontrol dispatcher di dashboard.

Semua pengguna aktif yang terautentikasi memiliki akses aplikasi yang sama. Persetujuan `APPROVED_INTERNAL` adalah persetujuan internal. Publishing/scheduling Instagram, Meta account linking, analytics Instagram, dan notifikasi/approval Telegram belum diimplementasikan.

## Menjalankan

Prasyarat: Bun, MySQL, MinIO, dan SMTP untuk alur email. n8n serta gateway AI diperlukan untuk pemrosesan konten nyata.

```sh
bun install
# Hanya pada lingkungan baru; jangan timpa .env yang sudah berisi konfigurasi.
cp .env.dist .env
# Sesuaikan .env dan buat database MySQL terlebih dahulu.
bun run migration:run
bun run seed:users
bun run dev
```

Jalankan `bun run jobs:dispatch` pada proses terpisah dan aktifkan dispatcher di dashboard setelah konfigurasi n8n siap. Seeder hanya untuk development: tiga akun demo, tidak menimpa akun yang sudah ada. Rincian ada di [panduan database](docs/DATABASE_GUIDE.md).

API default: `http://localhost:4000/api`; dokumentasi API: `/api/docs`; health: `/health`. Frontend berada di [repo frontend lokal](../frontend/README.md).

## Stack dan struktur

Bun, Hono, TypeORM/MySQL, Zod, MinIO, Sharp, Nodemailer, dan JWT. Dependency versi aktual ada di `package.json` dan `bun.lock`. Route berada di `src/routes/api.ts`; fitur berada langsung di `src/modules/`; migration dan seeder berada di `src/database/`.

- [Setup dan operasi](README_SETUP.md)
- [Indeks dokumentasi](docs/README.md)
- [Arsitektur](docs/ARCHITECTURE.md)
- [Konfigurasi](docs/ENVIRONMENT.md)
- [Integrasi n8n](integrations/n8n/README.md)
- [Aturan kontribusi](AGENTS.md)

## Verifikasi

```sh
bun run typecheck
bun run test
bun run build
```

Test memakai database MySQL khusus yang dapat dihapus dan adapter eksternal terkontrol. Baca [panduan pengujian](docs/TESTING_GUIDE.md) sebelum menjalankannya. Sync schema selalu nonaktif; baseline development saat ini terdiri dari 13 migration per tabel.
