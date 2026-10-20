# Implementasi konten IG Flow

Dokumen ini menjelaskan perilaku aktif pada 20 Oktober 2026 dan menggantikan deskripsi implementasi awal yang sudah usang. [PRD v1.1](../archive/specifications/prd-v1.1.md) tetap tersedia sebagai spesifikasi awal yang diarsipkan.

## Alur pengguna

1. Login dengan akun aktif; semua user memiliki akses setara.
2. Isi metadata kegiatan dan unggah foto di Content Upload. UI memvalidasi per file; backend memeriksa bytes, format, dimensi dan batas batch. File yang sudah berhasil tidak diulang hanya karena file lain gagal.
3. Pilih output feed/story dan proses batch. Backend mengunci batch, membuat job dan outbox secara atomik.
4. Worker menyampaikan event ke n8n. n8n mengklaim execution, mengambil manifest, menganalisis semua aset, membuat caption serta render, lalu memanggil result/failure.
5. Buka Content Detail untuk melihat foto, summary, error/status dan timeline. Status ready for review langsung menampilkan form dan aksi Publish/Reject.
6. Pada Publish, sesuaikan caption/foto, pilih akun dan waktu posting. Perubahan disimpan sekaligus dengan snapshot publikasi, tanpa simpan terpisah. Reject mengakhiri konten.

## Data dan transaksi

Status job dan status review adalah dua state berbeda; tab Content memetakan keduanya ke list terpadu. Backend melindungi idempotency process/retry, claim execution, duplicate callback, content hash dan keputusan publish/reject. Desain AI hanya tersedia untuk isi yang cocok dengan hasil AI; belum ada re-render otomatis setelah edit.

Database aktif memiliki 13 tabel aplikasi termasuk publications; tabel history lama dikonsolidasikan ke drafts dan arsip audit. Domain konten memakai UUID, user tetap integer. Modul dipisah menjadi content, ai-job, content-review, reporting dan integration dengan shared repository transaksi. Tidak ada role atau modul social.

## Media

JPG/JPEG, PNG dan WEBP statis didukung; backend membatasi gambar sampai 40 megapixel dan memeriksa kecocokan ekstensi, MIME serta hasil decode. Original immutable disimpan ke MinIO; preview JPEG menghapus metadata dan thumbnail mendukung tampilan blur-to-sharp. SVG dari AI disanitasi dengan allowlist dan foto terpilih dari storage, lalu disimpan sebagai objek render.

Satu bucket privat menyimpan seluruh media; database hanya key/metadata. n8n menggunakan URL preview presigned MinIO. Tidak ada media lokal persisten, proxy generik, secret media tambahan atau inline SVG database.

## Integrasi dan batas produk

Workflow repo menggunakan kontrak camelCase dengan format API AI OpenAI-compatible. Backend tetap mendukung adapter legacy untuk kontrak lama. Pengaturan dispatcher ada di dashboard; URL dan secret tetap di environment/n8n credential.

Publikasi dan penjadwalan gambar feed/story tersedia melalui Graph API dengan credential JSON. Analytics akun dan postingan tersedia pada menu Analytics serta insight publikasi Content. Belum ada Meta OAuth onboarding, Telegram, dan re-render otomatis hasil edit. Data overview adalah aktivitas aplikasi, bukan engagement Instagram.

Uji nyata yang pernah dilakukan dicatat di [audit n8n](../archive/audits/audit-n8n-2026-10-18.md); itu bukti pada tanggal pengujian, bukan jaminan layanan selalu aktif. Setup backend lokal memerlukan worker dan tunnel yang hidup. Ikuti [runbook](../operations/n8n.md) untuk operasi dan pemulihan.
