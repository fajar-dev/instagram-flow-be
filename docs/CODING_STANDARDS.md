# Konvensi kode backend IG Flow

## Struktur dan penamaan

Pertahankan module per fitur di `src/modules/`. Child yang hanya milik satu fitur tetap berada di dalam fitur tersebut: media di content, workflow di ai-job. Gunakan kebab-case untuk file, PascalCase untuk class/interface dan camelCase untuk properti TypeScript/JSON. Tabel dan kolom MySQL memakai snake_case. User memakai ID integer; resource konten memakai UUID.

Gunakan gaya file yang sedang diedit; jangan menggabungkan perubahan perilaku dengan reformat massal. Referensi CRUD adalah User, autentikasi adalah Auth. Helper stateless backend berada di `src/core/helpers/` atau modul pemilik; jangan menyalin logic validasi/query ke setiap controller.

## Aturan implementasi

- Wiring dependency ada di `*.module.ts`. Service menerima interface repository; TypeORM tetap di repository.
- Body JSON divalidasi Zod dan diteruskan melalui `c.req.valid`. Query list memakai validator bersama dan sort yang diizinkan repository, bukan interpolasi query bebas.
- Gunakan exception di `src/core/exceptions/base.ts` dan envelope ApiResponse. Jangan menelan exception atau mengganti kegagalan dengan hasil sukses kosong.
- Serializer menentukan data keluar, termasuk URL avatar. Jangan mengembalikan password hash, token, secret, atau entity mentah yang memuat data internal.
- Config runtime berasal dari `src/config/config.ts`. Jangan membaca environment tersebar di service.
- Gunakan `logger`; jangan mencetak credential, authorization, reset token, atau URL bertanda tangan.
- Null adalah pengosongan field nullable; undefined berarti field tidak diperbarui.
- Transaksi/lock harus tetap melindungi process, claim, reset password, revision, dan review yang bersaing.

## Aturan domain

Tidak ada role pengguna atau pembatasan berdasarkan kepemilikan. Autentikasi pengguna aktif dan service token tetap wajib. Semua media persisten disimpan di bucket MinIO yang sama. Hindari secret penandatanganan media tambahan atau proxy URL umum.

Setiap request/resend reset password menghasilkan token email baru; satu reset berhasil menghapus seluruh token user melalui transaksi. Jangan memindahkan token kembali ke tabel users.

Migration dan seeder dijalankan melalui script package, bukan background job. Sync selalu false. Setiap tabel baru memiliki file migration sendiri; pertahankan history setelah baseline development 19 Oktober 2026.

## Verifikasi perubahan

Jalankan typecheck, test dan build sesuai [panduan test](TESTING_GUIDE.md). Perubahan kontrak memperbarui validator, serializer, OpenAPI, test terkait dan dokumentasi. Perubahan komentar/dokumentasi cukup diperiksa terhadap source dan tautannya; jangan menambah test yang hanya membandingkan teks dokumentasi.
