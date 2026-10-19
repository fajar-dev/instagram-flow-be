# Pengujian backend IG Flow

## Prasyarat dan command

Install dependency dan siapkan MySQL yang dapat diakses oleh konfigurasi DB. `DB_TEST_NAME` harus berbeda dari `DB_NAME`, berakhiran `_test`, dan hanya memakai huruf, angka, underscore. Suite memakai `dropSchema: true`, sehingga database test harus disposable.

```sh
bun run typecheck
bun run test
bun run build
```

Script test memberi timeout 30 detik. Untuk satu suite: `bun test test/content-workflow.test.ts --timeout 30000`. Jangan menjalankan beberapa proses test pada database test yang sama secara bersamaan.

## Yang diuji

`test/setup.ts` memasang DataSource MySQL test, menerapkan migration yang sama, dan mendaftarkan route melalui `registerRoutes`. SMTP, storage dan transport eksternal dikendalikan test; suite tidak membuktikan bahwa server n8n, Google, SMTP atau gateway AI deployment sedang sehat.

Test mencakup auth/reset password, user, upload/storage, pagination/bahasa/logging, fresh migration dan rollback/reapply, job/outbox/claim, hasil callback duplikat, sanitasi SVG, edit/review revision, dispatcher settings dan reporting. `test/database.test.ts` juga memastikan route Contact sudah tidak tersedia.

## Menulis regresi

Gunakan helper di `test/helpers.ts` dan `test/setup.ts`. Uji perilaku yang dapat diamati: response, persistence, akses, idempotency dan race bila relevan. Gunakan gambar sintetis dan credential uji; jangan menyimpan foto proyek atau secret deployment. Perubahan dokumentasi tidak memerlukan test implementasi baru.

## Uji integrasi nyata

Pada lingkungan pengujian, pastikan backend, worker, MinIO, n8n dan callback tunnel aktif. Uji upload beberapa gambar termasuk satu invalid, proses output feed/story, tunggu completion, ubah caption, simpan, lalu review. Periksa bahwa request gagal tidak menghapus upload lain, render outdated tidak dianggap final, dan review memakai revision terbaru.

Periksa juga kegagalan tunnel/claim, retry setelah pemulihan, serta URL MinIO kedaluwarsa. Langkah yang memanggil AI membutuhkan gateway nyata; jangan menyatakan E2E live berhasil hanya karena suite mock lolos. Catat waktu dan batas verifikasi pada hasil pengujian.

## Regresi publishing

`test/publishing.test.ts` menguji API terautentikasi, credential redaction, JPEG snapshot, konkurensi/idempotency, jadwal, cancellation dan rekonsiliasi hasil Meta yang ambigu. Adapter Meta dipalsukan; test tidak memublikasikan konten ke akun nyata.
