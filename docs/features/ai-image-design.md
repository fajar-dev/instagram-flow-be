# Desain postingan AMTI

AI mendesain cover (komposisi kolase, warna dan judul) mengikuti referensi yang disetujui. Workflow n8n memasang logo asli dan footer secara deterministik melalui **Apply Branding**. Backend menerima dan menyimpan JPEG akhir; tidak menggambar template.

## Alur

1. Analisis memilih cover dan menghasilkan caption/judul. Feed mengolah seluruh foto upload, Story satu foto cover.
2. Prepare Design mengirim referensi gaya dan maksimal tiga foto pilihan untuk cover. AI membuat kolase, judul faktual dan warna mengikuti referensi, tanpa logo/footer buatan model. Slide berikutnya menerima satu foto sumber tanpa judul/kolase. Model boleh memperbaiki exposure, white balance, kontras dan noise serta crop proporsional, tanpa mengubah fakta lapangan.
3. Apply Branding memakai Sharp di runner n8n. AI menghasilkan satu kanvas portrait penuh. Prompt menetapkan judul Feed pada y=18–35% dan judul Story pada y=22–39%, terpisah dari area logo/footer. Normalisasi hanya memenuhi ukuran kanvas; tidak menyisipkan artwork persegi, latar pengganti atau pita header/footer. Logo dan footer dipasang di atas gambar utuh. Judul cover sudah digambar AI dari Parse Caption; compositor tidak menambahkan judul kedua.
4. Render Result membuat callback dengan urutan cover terlebih dahulu. Backend memvalidasi raster dan menormalisasi JPEG; gambar dengan dimensi final tidak dipangkas ulang sehingga geometri branding tetap.

Feed: 1080×1350. Story: 1080×1920, header/footer bergeser ke area aman. Logo GSI berada pada panel putih yang menempel kiri, AMTI pada panel kanan dengan label Powered by. Logo menggunakan rasio asli dan contain, bukan generasi ulang AI. Footer satu baris: website, Instagram, WhatsApp, LinkedIn. Ikon vektor berada di source workflow dan dirasterisasi ke JPEG, bukan SVG dalam database.

Koordinat, ukuran, warna dan label branding berada di `integrations/n8n/nodes/apply-branding.js`. Seluruh slide menggunakan konfigurasi yang sama. Footer: amti.co.id, Amtiofficial, +62 821-7370-1845, Asset Monitoring Teknologi Indonesia. Font runtime harus DejaVu Sans agar layout konsisten lintas host. Tipografi dan komposisi cover diarahkan melalui prepare-design.js.

## Runtime wajib

Runner JavaScript n8n memerlukan **sharp 0.35.5**, font DejaVu Sans, dan allowlist `NODE_FUNCTION_ALLOW_EXTERNAL=sharp`. Untuk external runner, set allowlist di `env-overrides` konfigurasi launcher, bukan hanya environment container. Lihat [deployment](../../DEPLOYMENT.md#runtime-branding-n8n) sebelum mengaktifkan workflow. Tanpa module/font yang disiapkan, jangan publish workflow baru.

Logo diunduh dari URL presigned bucket privat melalui Materialize Images. Provisioning aset tetap:

```sh
bun run brand:upload /path/to/approved-design-reference.png /path/to/amti-logo.png /path/to/graha-survei-logo.jpeg
```

Referensi desain dikirim hanya pada permintaan cover sebagai acuan gaya, bukan sumber foto/fakta proyek. Logo asli tidak dikirim untuk digambar ulang AI. Logo disimpan pada `brand/logo.png` dan `brand/partner-logo.jpeg`. Tidak ada gambar/secret pengguna dalam Git. Logo hilang, hasil AI invalid atau seri tidak lengkap menyebabkan workflow gagal; tidak ada fallback logo generatif atau foto mentah.

## Batas dan publikasi

Callback tetap satu render per foto Feed (maksimal 19) atau satu Story. Backend membatasi body 64 MiB dan memvalidasi raster statis. Pengguna memilih 1–10 gambar untuk publikasi Feed dan mengatur urutannya; Story tepat satu. Snapshot publikasi immutable dan hasil lama tidak dimodifikasi.

Perubahan metadata di form publish tidak mengubah piksel judul cover. Preview harus diperiksa sebelum publish. n8n tidak memublikasikan langsung ke Instagram.

Tes mencakup geometri header/footer antar-slide (toleransi kompresi JPEG), ukuran Feed/Story, logo wajib, routing workflow dan urutan render. Preview lokal memakai foto proyek dan logo asli; ini menguji compositor, bukan panggilan AI baru atau execution produksi.
