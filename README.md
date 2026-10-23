# IG Flow — Backend

API dan worker untuk IG Flow, dashboard AMTI (Asset Monitoring Teknologi Indonesia) untuk menyiapkan konten Instagram dari dokumentasi kegiatan. Backend mengelola unggahan, proses AI melalui n8n, hasil render, review internal, dan publikasi Instagram multi-account.

## Cakupan saat ini

- Login email/password dan Google, profil, reset password, dan pengelolaan pengguna.
- Batch foto dengan metadata kegiatan, validasi gambar per file, preview aman, dan penyimpanan privat MinIO.
- Job AI dengan outbox, claim execution, retry, watchdog, serta callback hasil/failure dari n8n.
- Review langsung menuju Publish atau Reject. Caption dan foto disesuaikan saat publish, lalu disimpan atomik bersama snapshot postingan.
- Overview, media library, audit log, dan kontrol dispatcher di dashboard.

Semua pengguna aktif yang terautentikasi memiliki akses aplikasi yang sama. Ready for review langsung menuju Publish atau Reject. Satu project hanya memiliki satu postingan ke satu akun, langsung atau terjadwal. Analytics akun dan postingan tersedia melalui Instagram Login. OAuth account linking dan Telegram belum diimplementasikan.

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

Jalankan `bun run jobs:dispatch` pada proses terpisah dan aktifkan dispatcher di dashboard setelah konfigurasi n8n siap. Seeder hanya untuk development: tiga akun demo, tidak menimpa akun yang sudah ada. Rincian ada di [panduan database](docs/operations/database.md).

API default: `http://localhost:4000/api`; dokumentasi API: `/api/docs`; health: `/health`. Frontend berada di [repo frontend lokal](../frontend/README.md).

## Stack dan struktur

Bun, Hono, TypeORM/MySQL, Zod, MinIO, Sharp, Nodemailer, dan JWT. Dependency versi aktual ada di `package.json` dan `bun.lock`. Route berada di `src/routes/api.ts`; fitur berada langsung di `src/modules/`; migration dan seeder berada di `src/database/`.

- [Setup dan operasi](docs/operations/setup.md)
- [Indeks dokumentasi](docs/README.md)
- [Arsitektur](docs/architecture/overview.md)
- [Konfigurasi](docs/operations/environment.md)
- [Integrasi n8n](docs/operations/n8n.md)
- [Aturan kontribusi](AGENTS.md)

## Verifikasi

```sh
bun run typecheck
bun run test
bun run build
```

Test memakai database MySQL khusus yang dapat dihapus dan adapter eksternal terkontrol. Baca [panduan pengujian](docs/operations/testing.md) sebelum menjalankannya. Sync schema selalu nonaktif; baseline development terdiri dari 13 migration untuk 13 tabel aplikasi, termasuk publications.

## Instagram publishing

Credential multi-account berada di JSON privat. Jalankan `bun run posts:dispatch` untuk publikasi langsung/terjadwal. Ikuti [panduan publishing](docs/features/instagram-publishing.md) untuk konfigurasi Meta, MinIO dan pemulihan kegagalan.

## Instagram analytics

Statistik akun, perbandingan periode, top posts dan insight Content memakai Graph API dengan cache singkat. Lihat [panduan analytics](docs/features/instagram-analytics.md).

Panduan deployment server: [DEPLOYMENT.md](DEPLOYMENT.md).
