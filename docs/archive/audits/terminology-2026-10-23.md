# Audit istilah fitur — 23 Oktober 2026

Cakupan: nama modul/file, import, entity/serializer, route/validator, status, frontend types/services/components, locale en/id, workflow n8n, contoh credential, OpenAPI serta panduan aktif backend/frontend. Ini audit terminologi dan kontrak terkait, bukan klaim audit keamanan atau UAT production.

## Perbaikan

- Content draft dan penolakan menggunakan content-draft, decisionStatus, Rejection, rejections dan rejectedBy. GET /drafts menggantikan endpoint review tanpa alias lama. Migration tambahan menyelaraskan schema database yang sudah ada.
- Identitas pengaju publikasi, penolak dan pembatal disajikan sebagai keputusan dengan actor dan waktu yang berbeda dari waktu delivery Instagram.
- Modul dispatcher settings menggunakan settings pada backend, frontend service/type dan locale. Validator executionIdSchema menjelaskan ID eksekusi n8n.
- InstagramAccount dipindah dari tipe publikasi ke instagram. Pilihan akun tunggal memakai selectAccount.
- Analytics hanya menerima tiga periode kalender yang ditampilkan UI. Test menolak dua rolling window lama.
- Contoh credential Instagram Login menggunakan accessToken, diuji melalui adapter pembaca yang sama dengan aplikasi.
- Label Total projects dan deskripsi Content sesuai data tanpa batas 30 hari. Pesan penyimpanan Settings berada di locale Settings.
- Package bernama ig-flow-backend/ig-flow-frontend. Dokumentasi desain AI tidak lagi bernama post-templates; panduan carousel, periode analytics dan callback development/production diperjelas.

## Perbedaan yang disengaja

Project adalah nama UI untuk aggregate Batch. Job, execution n8n, draft, render dan publication memiliki lifecycle berbeda. READY_FOR_REVIEW masih valid; PUBLISH bukan PUBLISHED. Nama schema lama hanya diperlukan pada migration historis/upgrade dan assertion ketidakhadirannya. Arsip tetap mempertahankan konteks historis. Identitas database/bucket/container deployment tidak diganti.

Acuan aktif: [glosarium](../../reference/terminology.md).

## Verifikasi

Backend: lint, typecheck, 206 test lulus; termasuk schema migration, idempotency, actor keputusan, publishing, n8n contract, analytics dan credential example. Frontend: lint, typecheck, 57 test lulus. Build kedua aplikasi diperiksa pada akhir perubahan. Tidak menjalankan migration production, login provider nyata, workflow n8n live atau publikasi Instagram. Tidak ada perubahan layout; pemeriksaan visual browser tidak dilakukan.
