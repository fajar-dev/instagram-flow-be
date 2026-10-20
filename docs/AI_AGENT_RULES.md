# Panduan kontribusi agent — IG Flow backend

Baca [AGENTS.md](../AGENTS.md) untuk aturan utama, lalu [arsitektur](ARCHITECTURE.md) dan panduan fitur yang disentuh. Dokumen ini menjelaskan urutan kerja; aturan tidak perlu disalin ulang ke setiap file.

1. Periksa perubahan pengguna dan route/module terkait sebelum mengedit. Gunakan User/Auth sebagai contoh implementasi yang masih aktif.
2. Pastikan perilaku yang diminta sesuai batas produk: semua user aktif setara, media privat MinIO, review internal, AI lewat n8n.
3. Ikuti controller → service → repository interface. Wiring di module; config di parser; route di api.ts.
4. Jika kontrak berubah, perbarui validator, serializer, frontend consumer, OpenAPI dan test regresi terkait.
5. Perubahan schema memakai migration baru, satu tabel per file, dan sync tetap false. Baseline development 19 Oktober 2026 menggantikan baseline sebelumnya; jangan mengulang reset tanpa permintaan eksplisit.
6. Jalankan pemeriksaan yang sesuai, laporkan hasil nyata dan batas pengujian eksternal. Perubahan dokumentasi diperiksa terhadap source, link dan command, tanpa mengubah database atau menjalankan workflow AI.
7. Perbarui dokumentasi aktif dan changelog. Audit bertanggal serta PRD awal adalah arsip; jangan mengambil instruksi role/menu/storage lama dari arsip sebagai aturan sekarang.

Jangan commit `.env`, token, credential export n8n atau data pribadi. Jangan menjalankan migration/seeder sebagai job. Jangan menambahkan facade social atau media proxy generik.

## Format source

`bun run format` menjalankan ESLint, Prettier, lalu ESLint dan membangun ulang workflow JSON n8n dari source. `bun run lint` memeriksa jarak fungsi/method, batas statement per baris dan braces. Gunakan bersama typecheck, test dan build sebelum menyerahkan perubahan. Backend mengikuti indentasi empat spasi dan double quote seperti modul User; secrets, hasil build dan media tidak termasuk target formatter.
