# Database IG Flow

Backend menggunakan MySQL, TypeORM dan driver mysql2. `synchronize` selalu false, termasuk test. Koneksi memakai timezone UTC; tampilan workflow memakai Asia/Jakarta.

## Baseline development aktif

Baseline 20 Oktober 2026 terdiri dari **13 file untuk 13 tabel**, timestamp `1792490400000` sampai `1792490400012`. Registrasi dan urutan dependency berada di `src/database/migrations/index.ts`.

| Tabel | Data |
| --- | --- |
| users | Identitas, password hash, status aktif, key avatar |
| password_reset_tokens | Hash token reset, user/email, expiry |
| batches | Metadata kegiatan, consent, status unggahan |
| assets | Metadata dan key original/preview/thumbnail MinIO |
| jobs | State proses AI, attempt dan idempotency |
| job_dispatches | Outbox dan state pengiriman n8n |
| ai_results | Hasil analisis AI |
| renders | Metadata render dan key MinIO |
| drafts | Konten aktif, content hash dan keputusan |
| reviews | Catatan penolakan dan reviewer |
| audit_logs | Jejak aktivitas |
| settings | Kontrol dispatcher non-secret |
| publications | Snapshot postingan, akun, jadwal dan state delivery |

Tabel `migrations` merupakan ledger TypeORM, bukan tabel domain. Tidak ada tabel revisi, Contact, role, atau media biner. Schema sudah langsung mendukung Review → Publish/Reject; publication memiliki unique batch_id untuk satu postingan per project. Seluruh migration hanya membuat/menghapus satu tabel. `down` dijalankan dalam urutan terbalik agar dependency foreign key terjaga.

## Command

```sh
bun run migration:show
bun run migration:run
bun run migration:revert
bun run migration:create src/database/migrations/nama-perubahan
bun run migration:generate src/database/migrations/nama-perubahan -d src/config/database.ts
bun run seed:users
```

Database kosong cukup menjalankan `migration:run`. Seeder terpisah; migration tidak mengisi akun demo atau menjalankan job. Migration berikutnya harus memakai file baru kecuali pengguna meminta reset baseline development lagi. `migration:revert` menghapus tabel dari migration terakhir dan seluruh datanya; gunakan hanya pada database disposable atau setelah backup.

## Database development yang sudah berisi data

Baseline ini menggantikan rangkaian migration sebelum production atas permintaan pengguna. Jangan langsung menjalankan baseline baru pada database dengan ledger lama: TypeORM akan mencoba membuat tabel yang sudah ada.

Untuk mempertahankan data, backup database beserta ledger, bandingkan schema setiap tabel terhadap database disposable yang dibuat dari baseline baru, dan pastikan kolom, tipe, default, indeks serta foreign key cocok. Setelah cocok, ganti ledger secara transaksional dengan 13 nama/timestamp baseline. Jangan menandai migration applied hanya berdasarkan nama tabel. `migration:show` membaca ledger; ia tidak membuktikan kesamaan schema.

Database lokal pada task ini diselaraskan melalui prosedur tersebut tanpa menghapus data aplikasi. Database lain harus diverifikasi secara terpisah. Alternatif pembuatan ulang database development memerlukan persetujuan untuk penghapusan datanya.

## Seeder dan reset password

`src/database/seeders/user.seeder.ts` menyediakan fixture serta entrypoint CLI; `index.ts` hanya koordinator. Akun demo: admin@example.com, budi@example.com, siti@example.com; password development `password123`. Email yang sudah ada dilewati. Nama Admin Demo tidak memberi akses khusus.

Request/resend password membuat token baru di password_reset_tokens. Token lama tetap valid sampai kedaluwarsa. Satu reset berhasil mengganti password dan menghapus seluruh token user dalam transaksi dengan lock.

## Backup media

Original, preview, thumbnail, avatar dan render berada di satu bucket privat MinIO. Backup database saja tidak cukup untuk memulihkan media. Credential integrasi berada di environment atau JSON privat server dan tidak disimpan dalam tabel domain.
