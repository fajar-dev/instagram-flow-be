# Dokumentasi backend IG Flow

Mulai dari [README project](../README.md) untuk menjalankan aplikasi dan [AGENTS.md](../AGENTS.md) untuk aturan kontribusi.

## Panduan aktif

| Kategori | Isi |
| --- | --- |
| [Aturan pengembangan](rules/README.md) | Standar yang berlaku saat mengubah kode dan menjalankan audit. |
| [Arsitektur](architecture/README.md) | Struktur aplikasi, tanggung jawab layer, dan peta fitur. |
| [Fitur](features/README.md) | Perilaku produk dan kontrak integrasi per fitur. |
| [Operasional](operations/README.md) | Setup, konfigurasi, database, pengujian, logging, dan n8n. |
| [Referensi](reference/README.md) | Konvensi API dan dokumentasi OpenAPI. |
| [Arsip](archive/README.md) | Laporan audit dan keputusan historis; bukan aturan aktif. |
| [Changelog](changelog.md) | Ringkasan perubahan lintas fitur. |

## Penempatan dokumentasi

- Aturan yang harus diikuti masuk `rules/`; laporan hasil audit masuk `archive/audits/`.
- Penjelasan struktur dan batas layer masuk `architecture/`; perilaku fitur masuk `features/`.
- Referensi komponen atau kontrak masuk `reference/`. Runbook backend berada di `operations/`.
- Perbarui panduan aktif ketika implementasi berubah; jangan menyalin runbook ke laporan audit.
- Gunakan nama file kebab-case dan tautan relatif. Tambahkan dokumen baru ke indeks kategorinya.
- Simpan credential di konfigurasi privat, bukan dokumentasi.

## Acuan implementasi

Source, validator, konfigurasi dan tes menjelaskan perilaku yang berjalan; dokumentasi aktif harus diselaraskan dengannya. Jika perubahan menyentuh aturan, perbarui AGENTS.md dan CLAUDE.md secara identik. Riwayat audit tidak menggantikan aturan aktif.

[Dokumentasi frontend](../../frontend/docs/README.md).
