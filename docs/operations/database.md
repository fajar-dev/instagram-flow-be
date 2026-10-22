# Database IG Flow

Backend memakai MySQL, TypeORM dan mysql2. `synchronize` selalu false, termasuk test. Koneksi UTC; tampilan workflow Asia/Jakarta.

## Schema aktif

Registrasi berada di `src/database/migrations/index.ts`: **13 migration, 13 tabel domain**.

- 1792490400000–1792490400012: users, password_reset_tokens, batches, assets, jobs, job_dispatches, ai_results, renders, drafts, reviews, audit_logs, settings, publications.

Semua file langsung membuat schema final. Kolom child_container_ids berada di baseline publications; tidak ada migration ALTER/normalisasi snapshot lama.

Tidak ada tabel Contact, role atau revisi. Job memilih satu output Feed/Story. Draft menyimpan konten dan keputusan Review → Publish/Reject. Publications memiliki unique batch_id: satu proyek, satu akun, satu postingan. Media biner berada di MinIO, bukan database.

## Menjalankan

```sh
bun run migration:show
bun run migration:run
bun run migration:revert
bun run seed:users
```

Database kosong menjalankan semua migration berurutan. Konsolidasi development 21 Oktober 2026 menggabungkan perubahan carousel dan penghapusan field lama ke baseline. Database development yang sudah menjalankan 15 migration sebelumnya harus diverifikasi schema-nya dan dibackup sebelum dua entri migration transisi dihapus dari ledger; jangan menjalankan ulang CREATE TABLE pada database tersebut. Database dengan schema lain harus dibangun ulang dari baseline pada database kosong.

Jangan menggunakan synchronize. Migration berikutnya menggunakan file baru kecuali konsolidasi diminta eksplisit. Rollback baseline menghapus tabel beserta datanya, sehingga pemulihan memerlukan backup. Test database disposable menguji up/down seluruh rangkaian serta reapply dan schema final.

## Data operasional

Retry AI membuat attempt baru; histori tetap tersedia, tetapi daftar dan statistik menghitung attempt terbaru. Snapshot publikasi membekukan urutan gambar dan caption. Idempotency dan unique project publication mencegah posting ganda.

Seeder terpisah dari migration. Akun demo tidak memiliki role khusus. Token reset password berada di tabel terpisah; reset berhasil menghapus semua token pengguna dalam transaksi.

Backup database harus disertai bucket MinIO bila ingin memulihkan media. Credential integrasi tidak disimpan dalam tabel domain. Riwayat konsolidasi lama berada di changelog dan arsip audit.
