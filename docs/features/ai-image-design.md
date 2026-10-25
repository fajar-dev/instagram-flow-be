# Desain postingan AI AMTI

Desain cover mengikuti referensi visual AMTI otomatis: foto utama dengan kolase pendukung hingga empat kandidat. Tidak ada pilihan template dalam form atau API. Tiga referensi wajib: contoh tata letak, logo horizontal AMTI dan logo Graha Survei Indonesia. Model tetap dapat menafsirkan komposisi; hasil harus ditinjau sebelum publish.

## Alur

n8n menganalisis foto satu per request, memilih kandidat, membuat judul/caption lalu memanggil endpoint gambar gateway dengan foto sumber. n8n mengunduh referensi presigned MinIO satu kali per URL dan memvalidasi JPEG/PNG. Node **Prepare Design** menyusun prompt faktual dan data gambar inline; **Edit Image** menghasilkan gambar; **Render Result** hanya membungkus hasil base64 ke callback. Tidak ada fallback SVG atau komposisi teks di backend bila model gagal.

Gateway Codex yang diuji menggunakan `/v1/images/generations`, model `cx/gpt-image-2`, dan parameter JSON `images` untuk edit berbasis referensi. Ini adapter khusus 9router, bukan kontrak multipart Images API resmi. Model pengarah internal memakai `gpt-6.1-sol`; lihat [runbook n8n](../operations/n8n.md). Model teks tetap terpisah (`cx/gpt-5.6-luna`).

Callback menerima satu render per foto Feed (maksimal 19) atau satu render Story `format: jpeg`, `imageBase64`, asset ID dan output yang cocok dengan job. Backend membatasi body 64 MiB, base64 16 MiB / decoded 12 MiB, raster statis 40 megapixel dan sisi minimum 512 piksel. PNG/WebP/JPEG hasil provider didecode dan dinormalisasi ke JPEG Feed 1080×1350 atau Story 1080×1920 dengan crop tengah proporsional (cover), tanpa padding putih. Tepi putih seragam dipangkas dengan toleransi rendah sebelum resize; transparansi yang tersisa diratakan ke biru AMTI. Rasio yang berbeda dapat memangkas tepi desain, sehingga prompt meminta lettering/logo tetap aman di dalam panel. Backend tetap tidak menyusun desain atau menimpa foto asli. File disimpan di `renders/<uuid>.jpg` pada bucket MinIO yang sama. Database hanya metadata/hash, tidak menyimpan base64.

Penyimpanan dan preview render hanya menerima JPEG; SVG tidak didukung. Idempotency, claim ownership, validasi asset dan rollback objek tetap berlaku.

## Review dan publikasi

Review menampilkan semua gambar hasil edit AI. Cover memakai desain utama; foto Feed berikutnya diedit satu per satu dengan logo/footer saja. Pengguna memilih 1–10 gambar termasuk cover, mengubah urutan melalui drag handle atau tombol keyboard, lalu mengirim renderIds bersama caption/metadata. Metadata tidak mengubah piksel gambar. Tidak ada selector foto sumber/utama atau fallback foto mentah.

Publish mengambil gambar hasil AI dari MinIO dan membuat snapshot JPEG immutable melalui alur publikasi yang sudah ada. n8n tidak memublikasikan langsung. Satu project tetap satu akun dan satu postingan.

## Referensi visual

Gaya mengikuti contoh AMTI yang disetujui pengguna: foto latar penuh, lapisan biru/cyan, headline pendek condensed italic putih/kuning, kolase diagonal bergutter putih, dua logo asli di header dan footer berikon website, Instagram, WhatsApp serta LinkedIn. Referensi hanya memberi tata letak; foto, nama proyek, logo partner dan kontak dari contoh dilarang disalin. Semua isi proyek harus berasal dari metadata/foto batch.

Provisioning sebelum menjalankan workflow di lingkungan baru:

```sh
bun run brand:upload /path/to/approved-design-reference.png /path/to/amti-logo.png /path/to/graha-survei-logo.jpeg
```

Command memvalidasi referensi/AMTI PNG dan partner JPEG statis sebelum upload ke `brand/design-reference.png`, `brand/logo.png` dan `brand/partner-logo.jpeg` dalam bucket privat yang sama. Tidak ada file gambar referensi yang di-commit. Manifest service-authenticated memberi `designReferences.styleUrl` dan `logoUrl`/`partnerLogoUrl` presigned; workflow mengirimnya sebelum foto proyek dengan instruksi peran yang eksplisit. Referensi boleh diperbarui melalui command tersebut tanpa mengubah schema/credential. Ketika objek belum tersedia, generation gagal; tidak ada fallback desain polos.

Footer memakai detail AMTI dari contoh pengguna: website amti.co.id, Instagram Amtiofficial, WhatsApp +62 821-7370-1845, LinkedIn Asset Monitoring Teknologi Indonesia. Setiap label disertai ikon yang dikenali; seluruh ikon dan label berada dalam satu baris tipis mengikuti referensi. Logo Graha Survei di kiri dan AMTI horizontal beserta tagline di kanan, tanpa komposisi logo oleh backend. Logo tetap hasil reproduksi model gambar, bukan penyisipan piksel deterministik.

Logo header mengikuti panel yang menempel di tepi kiri/kanan dengan ujung dalam membulat dan ruang biru luas di tengah. Footer adalah satu pita putih tipis, empat ikon/label dalam satu baris, ujung kiri membulat dan ujung kanan menyentuh tepi. Tidak memakai grid 2×2 atau panel logo yang berdampingan di tengah.

## Konsistensi dan kualitas foto

Semua slide menerima aturan finishing yang sama: geometri logo/footer, skala logo, urutan ikon dan warna merek tetap. AI boleh memperbaiki exposure, white balance, highlight, shadow, kontras, noise dan ketajaman secara natural tanpa mengubah fakta lapangan. Foto harus memenuhi seluruh kanvas melalui crop/zoom proporsional; tidak ada letterbox atau bingkai putih luar. Panel logo/footer putih tetap bagian desain yang sah.

Perubahan berlaku pada hasil callback baru; render lama dan snapshot publikasi tidak dimodifikasi. Workflow JSON harus diimpor/diperbarui di n8n dan backend dirilis agar keduanya berlaku. Konsistensi piksel logo tetap bergantung pada model; tidak ada jaminan reproduksi identik atau validasi visual otomatis terhadap semua hasil AI.
