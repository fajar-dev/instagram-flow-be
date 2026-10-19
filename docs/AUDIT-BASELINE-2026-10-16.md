> **Arsip audit.** Catatan ini merekam implementasi dan hasil uji pada tanggalnya; beberapa keputusan telah digantikan. Gunakan [indeks dokumentasi aktif](README.md) untuk perilaku, konfigurasi, dan prosedur saat ini.

# Audit struktur dan reset baseline — 2026-10-16

Reset database dan migration dilakukan atas instruksi eksplisit pengguna. Baseline ini menggantikan seluruh migration sebelumnya; jangan menerapkannya sebagai upgrade pada database lama yang masih berisi data.

## Struktur akhir

- 14 tabel aplikasi, masing-masing satu migration pembuatan tabel. Tabel migration TypeORM menjadi tabel infrastruktur ke-15.
- Nama tabel: users, contacts, password_reset_tokens, batches, assets, jobs, job_dispatches, ai_results, renders, drafts, draft_revisions, reviews, audit_logs, settings.
- Tidak ada role, prefix tabel social_, maupun kolom sanitized_svg. Renders hanya menyimpan storage_key ke MinIO.
- Config runtime dipisah menjadi media, jobs, n8n. MEDIA_SIGNING_SECRET menggantikan SOCIAL_MEDIA_SECRET; TELEGRAM_NOTIFICATION_ENABLED menggantikan SOCIAL_TELEGRAM_NOTIFICATION_ENABLED. Nilai pada .env lokal dipertahankan saat nama kunci diganti.
- Dispatcher: bun run jobs:dispatch (src/commands/job-dispatch.ts).
- Semua route berada di src/routes/api.ts dengan middleware eksplisit seperti contact/user. Tidak ada prefix API /social atau alias halaman lama.
- Namespace terjemahan frontend mengikuti fitur: content, aiJob, contentReview, overview, integration. Backend menggunakan kelompok pesan content.
- Form contact berbagi FormFields.vue dan util/contact-form.ts seperti pola FormFields user. Handler klik pada modal edit induk dihapus agar interaksi form tidak menutup modal.
- Daftar entity diturunkan dari entity map sehingga registry tidak perlu dipelihara dua kali.
- Test workflow frontend menyiapkan API client sendiri pada setiap test; sebelumnya bergantung pada urutan file auth.test.js.
- Repository transaksi lintas fitur tetap dibagi di modules/shared untuk menjaga atomicity; controller tidak mengakses ORM.

## Reset lokal

Database aplikasi dikosongkan dan dibuat ulang menggunakan 14 migration baru. Seeder memasukkan 3 user dummy. Objek MinIO tidak dihapus; objek lama tidak otomatis terkait dengan metadata database yang telah direset. Restart proses aplikasi/dispatcher setelah perubahan nama environment dan command.

## Validasi

Suite backend mencakup pembuatan 14 tabel, rollback seluruh baseline lalu pembuatan ulang, index reset token non-unik per user, serta lifecycle API/auth/workflow. Tidak ditemukan blok identik 12 baris (lebih dari 450 karakter) lintas file runtime backend/frontend; pemeriksaan ini bukan jaminan bahwa tidak ada kemiripan semantik. Browser belum diuji kembali pada audit ini.

Hasil akhir: backend 154 test / 772 assertion lulus; frontend 30 test / 134 assertion lulus. Typecheck dan build kedua project, lint frontend, dan git diff --check berhasil. migration:show mengonfirmasi seluruh 14 migration telah diterapkan.
