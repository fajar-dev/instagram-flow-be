# Implementasi konten IG Flow

Dokumen ini menjelaskan perilaku aktif pada 21 Oktober 2026 dan menggantikan deskripsi implementasi awal yang sudah usang. [PRD v1.1](../archive/specifications/prd-v1.1.md) tetap tersedia sebagai spesifikasi awal yang diarsipkan.

## Alur pengguna

1. Login dengan akun aktif; semua user memiliki akses setara.
2. Isi metadata kegiatan dan unggah foto di Content Upload. UI memvalidasi per file; backend memeriksa bytes, format, dimensi dan batas batch. File yang sudah berhasil tidak diulang hanya karena file lain gagal.
3. Pilih tepat satu output Feed atau Story dan proses batch. Backend mengunci batch, membuat job dan outbox secara atomik.
4. Worker menyampaikan event ke n8n. n8n mengklaim execution, mengambil manifest, menganalisis semua aset, membuat caption Feed (kosong untuk Story) serta satu render per foto Feed atau satu render Story, lalu memanggil result/failure.
5. Buka Content Detail untuk melihat foto, summary, error/status dan timeline. Status ready for review langsung menampilkan form dan aksi Publish/Reject.
6. Pada Publish, Feed menampilkan caption/hashtag/metadata serta pilihan foto; Story menampilkan pilihan foto tanpa field caption/hashtag posting. Keduanya memilih akun dan waktu posting; gambar selalu hasil AI, dengan 1–10 slide Feed berurutan atau satu Story. Output tidak dapat diganti. Perubahan disimpan sekaligus dengan snapshot publikasi, tanpa simpan terpisah. Reject mengakhiri konten.

## Data dan transaksi

Status job dan status review adalah dua state berbeda; tab Content memetakan keduanya ke list terpadu. Backend melindungi idempotency process/retry, claim execution, duplicate callback, content hash dan keputusan publish/reject. Gaya AMTI menjadi instruksi edit gambar AI di n8n. Caption/hashtag boleh diubah; konteks visual desain harus tetap cocok.

Database aktif memiliki 13 tabel aplikasi termasuk publications; tabel history lama dikonsolidasikan ke drafts dan arsip audit. Domain konten memakai UUID, user tetap integer. Modul dipisah menjadi content, ai-job, content-review, reporting dan integration dengan shared repository transaksi. Tidak ada role atau modul social.

## Media

JPG/JPEG, PNG dan WEBP statis didukung; backend membatasi gambar sampai 40 megapixel dan memeriksa kecocokan ekstensi, MIME serta hasil decode. Original immutable disimpan ke MinIO; preview JPEG menghapus metadata dan thumbnail mendukung tampilan blur-to-sharp. Callback baru membawa raster base64 hasil edit AI. Backend memvalidasi dan menyesuaikan ukuran, lalu menyimpannya di MinIO. Tidak ada komposisi template backend; preview render hanya JPEG.

Satu bucket privat menyimpan seluruh media; database hanya key/metadata. n8n menggunakan URL preview presigned MinIO. Tidak ada media lokal persisten, proxy generik, secret media tambahan atau inline SVG database.

## Integrasi dan batas produk

Workflow repo menggunakan kontrak camelCase dengan format API AI OpenAI-compatible. Backend hanya menerima kontrak camelCase yang sama. Pengaturan dispatcher ada di dashboard; URL dan secret tetap di environment/n8n credential.

Publikasi dan penjadwalan gambar feed/story tersedia melalui Graph API dengan credential JSON. Analytics akun dan postingan tersedia pada menu Analytics serta insight publikasi Content. Belum ada Meta OAuth onboarding atau Telegram. Data overview adalah aktivitas aplikasi, bukan engagement Instagram.

Uji nyata yang pernah dilakukan dicatat di [audit n8n](../archive/audits/audit-n8n-2026-10-18.md); itu bukti pada tanggal pengujian, bukan jaminan layanan selalu aktif. Setup backend lokal memerlukan worker dan tunnel yang hidup. Ikuti [runbook](../operations/n8n.md) untuk operasi dan pemulihan.

Daftar jobs dan ringkasan status menggunakan attempt terbaru per batch. Retry membuat attempt baru; kegagalan lama tetap tersimpan, tetapi tidak dihitung di Failed. Filter tanggal/status diterapkan setelah pemilihan attempt terbaru.
