# Database IG Flow

## Konfigurasi

Backend menggunakan MySQL melalui TypeORM dan driver mysql2. `src/config/database.ts` mendaftarkan entity serta migration. `synchronize` selalu false, termasuk pada test. Koneksi memakai timezone UTC (`Z`); tampilan waktu workflow di frontend memakai Asia/Jakarta.

## Baseline aktif

Baseline development 19 Oktober 2026 terdiri dari 13 file pada `src/database/migrations/`, timestamp 1792368000000 sampai 1792368000012. Urutan resmi ada di `index.ts`.

| Tabel | Data |
| --- | --- |
| users | Identitas, password hash, status aktif, key avatar |
| password_reset_tokens | Hash token, user/email, expiry |
| batches | Metadata kegiatan dan status unggahan |
| assets | Metadata original/preview dan key MinIO |
| jobs | Status proses, attempt, execution, idempotency |
| job_dispatches | Outbox dan state pengiriman |
| ai_results | Output analisis AI |
| renders | Metadata hasil render dan key MinIO |
| drafts | Revision aktif dan status review |
| draft_revisions | Snapshot isi draft dan content hash |
| reviews | Keputusan, reviewer, revision, catatan |
| audit_logs | Jejak aktivitas aplikasi |
| settings | Kontrol dispatcher non-secret |

Tabel `migrations` milik TypeORM merupakan ledger tambahan. Tidak ada tabel Contact, role atau media biner lokal/database. Detail kolom dan indeks ada pada migration/entity terkait; jangan memelihara salinan schema terpisah di dokumentasi.

## Command

```sh
bun run migration:show
bun run migration:run
bun run migration:revert
bun run migration:create src/database/migrations/nama-perubahan
bun run migration:generate src/database/migrations/nama-perubahan -d src/config/database.ts
bun run seed:users
```

Review DDL yang dihasilkan sebelum menjalankannya. Daftarkan class migration baru di `src/database/migrations/index.ts`. `migration:revert` membalik satu migration terakhir dan dapat menghapus data. MySQL DDL tidak selalu dapat di-rollback sebagai satu transaksi.

## Database development dengan history lama

Baseline ini sengaja menggantikan history sebelum production atas permintaan pengguna. Pada database lokal yang sudah direkonsiliasi, 13 migration tercatat applied tanpa menghapus data fitur aktif. Jangan menganggap database lain sudah direkonsiliasi.

Sebelum memakai baseline baru pada database lama, backup schema/data dan ledger, lalu pilih pembuatan ulang database development atau rekonsiliasi eksplisit. Rekonsiliasi harus membandingkan semua tabel, kolom, indeks dan constraint terhadap baseline, memastikan tabel Contact sudah tidak ada, kemudian menyelaraskan ledger hanya jika schema cocok. Jangan sekadar menandai migration applied atau menjalankan seed untuk memperbaiki schema. `migration:show` hanya memeriksa ledger, bukan kesamaan schema.

Setelah baseline ini, gunakan migration baru untuk perubahan schema. Reset development berikutnya memerlukan keputusan eksplisit.

## Seeder pengguna

`src/database/seeders/user.seeder.ts` berisi fixture, implementasi dan entrypoint CLI; `index.ts` mengoordinasikan `bun run seed`. Akun demo: admin@example.com, budi@example.com, siti@example.com; password development masing-masing `password123`. Email yang sudah ada dilewati tanpa mengganti password atau data. Nama Admin Demo tidak memberi akses khusus. Jalankan hanya pada lingkungan development yang sesuai.

## Reset password

Token disimpan sebagai SHA-256 di `password_reset_tokens`, terpisah dari users. Request/resend membuat token baru dan mengirim email lagi; token lama valid sampai kedaluwarsa. Reset berhasil memperbarui password dan menghapus seluruh token user dalam transaksi dengan lock, sehingga dua token tidak dapat berhasil bersamaan.

## Penyimpanan media

Original, preview, thumbnail, avatar dan render berada di satu bucket privat MinIO. Database menyimpan key serta metadata. Backup database tanpa bucket tidak cukup untuk memulihkan konten. Tidak ada command yang otomatis membersihkan semua objek yatim setelah reset database.

## Migration publishing

`1792371600000-create-publications.ts` menambahkan tabel publications sebagai migration ke-14. Tabel menyimpan accountKey, snapshot revisi, key JPEG MinIO, jadwal UTC, lease, container/media ID, status dan safe error. Credential tetap hanya di file JSON privat. Ini migration tambahan; 13 file baseline tidak diubah.

Migration 1792382399999–1792382400002 menambahkan pengarsipan percobaan gagal yang telah digantikan post berhasil, constraint unique publications.batch_id, normalisasi status draft, dan normalisasi riwayat review. Total 18 migration untuk 14 tabel. Setiap file memutasi satu tabel. Arsip menyimpan seluruh percobaan lama di audit_logs; snapshot backup dibuat sebelum migrasi lokal. Rollback normalisasi pada database berisi data memerlukan backup.
