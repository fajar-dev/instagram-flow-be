# Database IG Flow

Backend memakai MySQL, TypeORM dan mysql2. `synchronize` selalu false, termasuk test. Koneksi UTC; tampilan workflow Asia/Jakarta.

## Schema aktif

Registrasi berada di `src/database/migrations/index.ts`: **13 migration, 13 tabel domain**.

- 1792490400000–1792490400012: users, password_reset_tokens, batches, assets, jobs, job_dispatches, ai_results, renders, drafts, rejections, audit_logs, settings, publications.

Baseline 23 Oktober 2026 langsung membuat rejections/rejected_by dan drafts.decision_status, tanpa kolom decision redundan. Kolom child_container_ids berada di baseline publications; tidak ada migration ALTER/normalisasi snapshot lama.

Tidak ada tabel Contact, role atau revisi. Job memilih satu output Feed/Story. Draft menyimpan konten dan keputusan Review → Publish/Reject. Publications memiliki unique batch_id: satu proyek, satu akun, satu postingan. Media biner berada di MinIO, bukan database.

## Menjalankan

```sh
bun run migration:show
bun run migration:run
bun run migration:revert
bun run seed:users
```

Database kosong menjalankan semua migration berurutan. Konsolidasi development 23 Oktober 2026 menggabungkan carousel dan istilah keputusan final ke baseline. Ini baseline instalasi baru, bukan upgrade otomatis untuk schema lama. Database development yang sudah berisi data perlu backup serta penyelarasan schema dan ledger terverifikasi; jangan sekadar menghapus ledger atau menjalankan ulang CREATE TABLE. Database dengan schema berbeda dapat dibuat ulang hanya jika datanya memang boleh dihapus.

Jangan menggunakan synchronize. Migration berikutnya menggunakan file baru kecuali konsolidasi diminta eksplisit. Rollback baseline menghapus tabel beserta datanya, sehingga pemulihan memerlukan backup. Test database disposable menguji up/down seluruh rangkaian serta reapply dan schema final.

## Data operasional

Retry AI membuat attempt baru; histori tetap tersedia, tetapi daftar dan statistik menghitung attempt terbaru. Snapshot publikasi membekukan urutan gambar dan caption. Idempotency dan unique project publication mencegah posting ganda.

Seeder terpisah dari migration. Akun demo tidak memiliki role khusus. Token reset password berada di tabel terpisah; reset berhasil menghapus semua token pengguna dalam transaksi.

Backup database harus disertai bucket MinIO bila ingin memulihkan media. Credential integrasi tidak disimpan dalam tabel domain. Riwayat konsolidasi lama berada di changelog dan arsip audit.

## Penyelarasan lokal 23 Oktober 2026

Database lokal diperbarui tanpa reset data: tiga catatan keputusan READY_FOR_REVIEW lama diarsipkan ke audit_logs sebagai LEGACY_REVIEW_ARCHIVED; satu penolakan dipertahankan di rejections. Seluruh record asli diverifikasi terhadap backup privat di luar repository. Ledger diselaraskan menjadi 13 baseline setelah schema final diterapkan. Migration transisi dihapus dari source; database baru langsung memakai istilah final. Server lain tidak diubah.
