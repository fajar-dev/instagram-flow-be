# 📝 Changelog

Semua perubahan penting pada proyek ini akan didokumentasikan di file ini.

Format mengikuti [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.2] — 2026-10-15

### Changed
- Seeder user menggunakan tiga fixture dummy deterministik di user.seeder.ts, tanpa SEED_USER_*.
- Command tetap idempotent: akun existing tidak diubah; password dummy di-hash melalui UserService.

## [1.5.1] — 2026-10-15

### Changed
- Seeder user disatukan dalam user.seeder.ts; file implementasi dan module seeder terpisah dihapus.
- index.ts hanya koordinator seed; command seed dan seed:users tetap tersedia. Test dan aturan composition root CLI diperbarui.

## [1.5.0] — 2026-10-15

### Fixed
- Status akun pada access/refresh token, encoding email reset, redaksi token pada log, penghapusan foto nullable, serta source database yang terabaikan Git.

### Changed
- SMTP diinjeksikan dan ditunggu; kegagalan pengiriman mengembalikan 500. Storage memakai controller/service/adapter; list user bertipe; repository reset hanya expose use case.
- Tambah typecheck dan test regresi dengan adapter eksternal terisolasi. Keputusan dan batas dicatat di AUDIT-2026-10-15.md.

## [1.4.1] — 2026-10-15

### Changed
- Folder migration dipindahkan ke src/database/migrations agar satu induk dengan seeders; import, konfigurasi, test, dan dokumentasi diperbarui tanpa mengubah identitas migration.

## [1.4.0] — 2026-10-15

### Changed
- Request/resend menambah token reset tanpa membatalkan tautan sebelumnya; reset berhasil menghapus semua token user secara atomik.
- Migration baru menghapus unique user_id tanpa menghapus data token existing.
- Migration memakai CLI TypeORM (run/revert/show/generate/create); seeder melalui src/database/seeders dengan command seed dan seed:users, tanpa job.
- Test E2E mencakup resend, penghapusan semua token, isolasi antaruser, dan reset bersamaan menggunakan token berbeda.

## [1.3.0] — 2026-10-15

### Added
- Seeder user melalui `bun run seed:users` / `bun run seed`, dengan konfigurasi SEED_USER_NAME, SEED_USER_EMAIL, SEED_USER_PASSWORD.
- Seeder memvalidasi input, membuat user aktif dengan password hash, dan melewati email existing tanpa perubahan.
- Test integrasi login user hasil seed, idempotensi, dan penolakan konfigurasi invalid.

## [1.2.0] — 2026-10-15

### Changed
- Schema sync dinonaktifkan pada semua environment, termasuk test; schema dikelola melalui migration.
- Setup E2E membangun database kosong dengan migration aplikasi.

### Added
- Migration per tabel users dan contacts; migration password_reset_tokens tetap dipertahankan sesuai history.
- Pengujian inisialisasi database kosong, idempotensi runner, dan preservasi data existing.

## [1.1.0] — 2026-10-15

### Changed
- Token reset password dipisahkan dari users ke password_reset_tokens dengan hash SHA-256, expiry 10 jam, dan satu token per user.
- Reset password mengonsumsi token secara atomik; token lama diganti saat meminta tautan baru.
- Token milik akun nonaktif atau email yang sudah berubah ditolak.

### Added
- Entity dan repository reset token, FK cascade, migrasi token lama, serta perintah `bun run migration:run`.
- Test E2E penyimpanan, konsumsi sekali pakai, kedaluwarsa, concurrency, cascade, dan migrasi.

## [1.0.0] — 2026-10-15

### Changed
- Backend menggunakan MySQL saja melalui `mysql2`, dengan default port 3306.
- Pemilihan driver melalui environment dihapus; koneksi aplikasi dan test selalu memakai MySQL.
- Docker Compose menggunakan MySQL 8.4, health check MySQL, dan volume `mysql_data`.
- Setup test, template environment, serta panduan proyek diselaraskan dengan MySQL.

### Removed
- Dependency driver database alternatif dan cabang SQL khusus driver tersebut.

## [0.1.0] — 2026-06-18

### Added
- Initial release

---

## Template Entri Baru

```markdown
## [X.Y.Z] — YYYY-MM-DD

### Added
- Fitur baru

### Changed
- Perubahan pada fitur yang sudah ada

### Deprecated
- Fitur yang akan dihapus di versi mendatang

### Removed
- Fitur yang dihapus

### Fixed
- Perbaikan bug

### Security
- Perbaikan keamanan
```

### Versioning Rules

- **MAJOR** (X.0.0): Breaking changes, perubahan arsitektur besar
- **MINOR** (0.X.0): Fitur baru, module baru, penambahan endpoint
- **PATCH** (0.0.X): Bug fix, perbaikan kecil, update dependencies
