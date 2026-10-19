# Publikasi Instagram IG Flow

Fitur publishing memakai Instagram Graph API dengan Instagram Login. Satu project hanya memiliki satu record publikasi untuk satu akun; credential tidak disimpan dalam MySQL. Tidak ada webhook Instagram yang diperlukan untuk alur ini. n8n tetap mengelola AI, sedangkan worker backend menangani publikasi.

## Prasyarat Meta

Siapkan Instagram App dan akun Instagram Professional (Business/Creator). Tidak memerlukan Facebook Page. Gunakan Instagram User access token dengan permission instagram_business_basic dan instagram_business_content_publish. Stories memerlukan akun Business. Kebutuhan App Review/Advanced Access mengikuti kepemilikan akun dan akses aplikasi Meta.

Credential tidak dapat dibuat hanya dengan memasukkan username/password Instagram. Token harus diperoleh melalui alur Meta yang sesuai. Periksa masa berlaku, izin dan asset yang diberikan pada token; tidak ada OAuth onboarding atau token renewal otomatis pada implementasi ini.

Referensi: [Content Publishing Meta](https://developers.facebook.com/documentation/instagram-platform/content-publishing), [workspace resmi Meta](https://www.postman.com/meta/instagram/overview). Versi Graph dipin melalui graphVersion pada JSON (contoh v24.0); review kompatibilitas sebelum menggantinya. Dokumentasi utama Meta membatasi akses otomatis saat implementasi; batas deployment tetap perlu divalidasi dengan akun nyata.

## Credential JSON

Lokasi default: secrets/instagram-accounts.json, relatif direktori backend. Path dapat diubah dengan INSTAGRAM_CREDENTIALS_FILE. Contoh yang boleh di-commit ada di secrets/instagram-accounts.example.json. File aktual diabaikan Git; permission file disarankan 0600 dan akses dibatasi ke user worker/API. Jangan menaruhnya di public, MinIO atau frontend.

Isi graphVersion, app.appId/appSecret serta array accounts. Setiap akun mempunyai key stabil, label, instagramUserId, accessToken, enabled, tokenExpiresAt (ISO UTC atau null bila tidak diketahui). Aktifkan enabled setelah ID/token valid. App ID/secret adalah milik Instagram App; disimpan untuk administrasi saja dan tidak digunakan oleh adapter publishing. Request memakai graph.instagram.com. Jangan memakai Facebook Page token. Token dikirim sebagai Authorization header, bukan query access_token.

Backend membaca ulang file pada operasi sehingga perubahan tidak memerlukan restart. Perbarui file secara atomik agar worker tidak membaca JSON setengah tertulis. Key harus unik. Jangan mengganti instagramUserId di bawah key yang sudah dipakai antrean; worker memeriksa identitas tujuan dan menolak ketidakcocokan. Buat key baru untuk akun yang berbeda.

Settings menampilkan informasi akun aman dan tombol Periksa koneksi. Label Terkonfigurasi hanya berarti data tersedia; pemeriksaan koneksi menguji akses profil, bukan jaminan izin publish/kuota/story. Credential tidak pernah dikirim ke UI atau disimpan dalam publication snapshot.

## Menjalankan

```sh
bun run migration:run
bun run posts:dispatch
# Satu sweep untuk pemeriksaan operasional:
bun run posts:dispatch --once
```

Migration 1792371600000 menambahkan tabel publications setelah 13 migration baseline. Empat migration berikutnya (1792382399999–1792382400002) mengarsipkan percobaan gagal yang sudah digantikan publikasi berhasil, menambahkan unique project, memetakan status draft lama, dan menormalisasi riwayat keputusan tanpa menghapus catatannya. Tidak mereset data lama. jobs:dispatch tetap worker AI terpisah. Sakelar Dispatcher AI di Settings tidak menghentikan publikasi Instagram; hentikan proses posts:dispatch atau nonaktifkan akun untuk menghentikan pemrosesan akun tersebut.

Worker memeriksa pekerjaan sekitar setiap tiga detik. Production memerlukan process supervisor serta API/database/MinIO yang selalu tersedia. Menjalankannya di MacBook berarti jadwal tidak diproses ketika mesin tidur/mati. Pekerjaan yang terlambat akan diproses saat worker kembali aktif; tidak ada kebijakan otomatis melewati jadwal yang sudah lewat.

## Alur UI

Buka detail/editor Content yang READY_FOR_REVIEW, simpan revisi terbaru, lalu pilih Publish atau Reject. Publish memilih tepat satu akun, feed/story, sumber foto/desain, dan Post sekarang atau Jadwalkan. Tanggal/jam input adalah WIB; server menyimpan UTC. Izin publikasi batch harus sudah diberikan.

Foto memakai primary asset revisi. Desain AI hanya tersedia pada revisi pertama yang belum diedit dan mempunyai render sesuai. Setelah edit, pilih Foto atau buat ulang konten/desain; aplikasi belum melakukan re-render otomatis. Caption feed menggabungkan caption dan hashtag (maksimal 2.200 karakter). Caption tidak dikirim sebagai teks Story.

Snapshot JPEG final disimpan di bucket MinIO yang sama, ukuran 1080×1350 feed atau 1080×1920 story, dengan padding putih jika rasio sumber berbeda. SVG disimpan sebagai preview AI; worker menggunakan JPEG publikasi, bukan SVG. URL presigned dibuat ketika worker memproses pekerjaan dan harus dapat diambil Meta lewat HTTP/HTTPS publik tanpa header JWT aplikasi. TTL URL adalah satu jam.

Riwayat di panel Content menunjukkan status per akun, waktu, revision, preview JPEG final dan link postingan bila tersedia. Satu project hanya memiliki satu postingan; akun lain dipilih untuk project lain. Pembatalan hanya untuk QUEUED/SCHEDULED/FAILED; pembatalan mengubah draft menjadi REJECTED dan tidak membuka publikasi kedua.

## Ketahanan dan state

Status: QUEUED, SCHEDULED, PROCESSING, PUBLISHING, PUBLISHED, FAILED, UNKNOWN, CANCELLED.

- Request memakai Idempotency-Key; request sama mengembalikan baris yang sama. Key yang sama dengan payload berbeda menghasilkan konflik.
- Revision harus aktif dan READY_FOR_REVIEW saat antrean dibuat. Draft menjadi PUBLISH, dan tidak dapat diedit atau ditolak lagi. Status teknis QUEUED/SCHEDULED/PROCESSING/PUBLISHED/FAILED/UNKNOWN tetap ditampilkan di panel. Retry FAILED menggunakan record, snapshot, dan akun yang sama.
- Worker memakai lease/token database. Intent PUBLISHING dicatat sebelum menghubungi Meta.
- Container diproses bertahap; worker memeriksa FINISHED sebelum media_publish, serta kuota akun sebelum membuat container.
- Kegagalan sebelum publish dapat dicoba ulang dengan backoff terbatas. FAILED dapat di-retry dari UI.
- Timeout/error setelah intent publish menjadi UNKNOWN. Worker hanya memeriksa status container, tidak mengulang media_publish. Jika Meta melaporkan PUBLISHED, status dipulihkan; media ID/permalink dapat kosong jika response pertama hilang.
- UNKNOWN yang tidak dapat direkonsiliasi memerlukan investigasi akun/execution oleh operator. Tidak ada tombol force retry atau pengubahan database otomatis untuk menebak hasil.
- Lookup permalink gagal tidak mengubah publikasi sukses menjadi gagal.

## Cakupan pengujian

Test memakai MySQL terisolasi dan adapter Meta/MinIO terkontrol: auth, JSON redaction, snapshot JPEG, idempotency paralel, satu publikasi per project, balapan Publish/Reject, revision/consent, scheduling/cancel, worker concurrent, timeout reconciliation dan retry. Live publishing diuji pada 19 Oktober 2026 menggunakan konten sintetis di akun @fajar_chngo. Bukti dan batas pengujian dicatat di docs/AUDIT-INSTAGRAM-2026-10-19.md.

Cakupan awal adalah gambar tunggal feed dan story per akun. Carousel, Reels/video, onboarding OAuth dan penyegaran token otomatis belum diimplementasikan. Rate limit/permission tetap diputuskan Meta; UI Periksa koneksi bukan tes publish.

## Mendapatkan token Instagram Login

Di Instagram > API setup with Instagram login, tambahkan akun dan terima undangan Instagram Tester bila aplikasi masih development. Klik Generate token dan berikan izin yang diperlukan. Masukkan ID akun Instagram dan token hasilnya ke instagramUserId/accessToken pada JSON privat, lalu enabled=true. Jangan isi file example dengan kredensial nyata. Masa berlaku token harus mengikuti token yang diterbitkan, bukan tanggal perkiraan; token renewal masih manual. Verifikasi melalui Settings > Periksa koneksi. Webhook tidak diperlukan.

## Migrasi alur sederhana

Status review lama yang belum memiliki publikasi dipetakan ke READY_FOR_REVIEW. Draft dengan publikasi menjadi PUBLISH; publikasi CANCELLED menjadi REJECTED. Catatan keputusan historis tetap dipertahankan. Jika satu project mempunyai tepat satu post berhasil dan percobaan FAILED/CANCELLED, percobaan terminal dipindahkan utuh ke audit log sebelum record duplikat dibersihkan. Bila ada beberapa post berhasil atau pekerjaan aktif yang bersaing, migration menolak dan memerlukan rekonsiliasi manual. Migration normalisasi tidak dapat dibalik pada database berisi data tanpa restore backup.

PUBLISH adalah tahap pengiriman, bukan konfirmasi tayang. Satu project berarti satu batch ID, bukan kesamaan teks nama project. Unique publications.batch_id mencegah publikasi ulang lintas akun, revisi, placement, dan percobaan job. Transaksi menggunakan READ COMMITTED dengan lock project lalu draft agar request bersamaan membaca pemenang yang telah commit.
