# Mengembangkan fitur IG Flow

Panduan ini menggunakan modul yang benar-benar ada sebagai acuan. Tidak ada generator CRUD atau fitur contoh yang perlu diaktifkan.

## Pilih pemilik perubahan

CRUD akun berada di `user`; login/password di `auth`; batch/asset di `content`; proses/retry/callback di `ai-job`; draft/penolakan di `content-draft`; sakelar dispatch di `settings`; list dan statistik di `reporting`. Lihat [arsitektur](../architecture/overview.md) sebelum menambah modul baru. Child terkait ditempatkan dalam modul pemilik.

## Referensi konkret

- Controller: `src/modules/user/user.controller.ts` memvalidasi query list dan menunggu serializer avatar yang asynchronous.
- Service: `src/modules/user/user.service.ts` menerima repository interface dan menjalankan aturan akun.
- Repository: `src/modules/user/repositories/user.repository.ts` menangani persistence.
- Composition root: `src/modules/user/user.module.ts` menyusun dependency.
- Alur transaksi: `src/modules/content-draft/draft.service.ts` memakai repository workflow dan pemeriksaan hash konten dan status.

## Menambah atau mengubah endpoint

1. Tentukan input/output dan siapa yang memanggil: JWT pengguna atau callback n8n.
2. Tambahkan validator di fitur pemilik. Gunakan validator bersama untuk UUID, pagination, output placement, dan idempotency.
3. Tambahkan operasi repository interface hanya jika diperlukan; implementasikan transaksi di repository.
4. Jalankan aturan domain di service, lalu serialisasi output melalui controller.
5. Wiring di composition root yang ada. Daftarkan endpoint hanya di `src/routes/api.ts`.
6. Perbarui `swagger.yaml`, test API dan dokumentasi fitur. Uji jalur sukses, invalid input, auth, konflik dan request ulang bila relevan.

## Perubahan persistence

Daftarkan entity baru langsung di konfigurasi database atau melalui `src/modules/shared/entities.ts` untuk entitas konten. Buat migration di `src/database/migrations/`, satu tabel per file, dan daftarkan di index. Modul tanpa persistence tidak memerlukan entity atau migration kosong. Panduan detail ada di [database](../operations/database.md).

## Integrasi

Pertahankan HTTP client n8n di adapter workflow dan MinIO di helper/adapter media. Jangan menambahkan SDK AI ke backend untuk menggantikan flow n8n tanpa keputusan arsitektur yang jelas. Code-node n8n ada di `integrations/n8n/nodes/`; perubahan di sana harus dibangun kembali dan diuji, bukan diedit hanya pada JSON hasil build.
