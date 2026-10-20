# Dokumentasi backend IG Flow

Panduan aktif menjelaskan implementasi IG Flow saat ini. Source route, validator, migration, dan konfigurasi menjadi acuan ketika mengubah kontrak. Audit bertanggal dan PRD awal adalah riwayat keputusan, bukan petunjuk deployment terbaru.

| Kebutuhan | Dokumen |
| --- | --- |
| Menjalankan API dan worker | [Setup](../README_SETUP.md) |
| Alur produk dan batas fitur | [Implementasi konten](content-automation/IMPLEMENTATION.md) |
| Layer dan pembagian fitur | [Arsitektur](ARCHITECTURE.md), [peta proyek](PROJECT_MAP.md) |
| Mengubah fitur | [Panduan modul](MODULE_GUIDE.md), [konvensi kode](CODING_STANDARDS.md) |
| API dan autentikasi | [Kontrak API](API_CONVENTIONS.md), [OpenAPI](SWAGGER_GUIDE.md) |
| MySQL, migration, seeder | [Database](DATABASE_GUIDE.md) |
| Environment | [Konfigurasi](ENVIRONMENT.md) |
| Test dan verifikasi | [Pengujian](TESTING_GUIDE.md) |
| Bahasa dan logging | [i18n](LANGUAGE_GUIDE.md), [log](LOGGING_GUIDE.md) |
| n8n dan tunnel | [Runbook integrasi](../integrations/n8n/README.md) |
| Kontribusi agent | [AGENTS](../AGENTS.md), [alur kerja agent](AI_AGENT_RULES.md) |
| Perubahan | [Changelog](CHANGELOG.md) |

## Arsip

Dokumen `AUDIT-*.md`, [PRD v1.1](content-automation/PRD-v1.1.md), dan [catatan refactor](content-automation/REFACTOR-2026-10-16.md) menyimpan keputusan pada tanggalnya. Sebagian keputusan sudah digantikan: aplikasi kini tanpa role, tanpa Contact, memakai 13 migration baseline untuk 13 tabel, termasuk publications dan satu bucket MinIO. Indeks berkas aktif ada di [FILE_MANIFEST](content-automation/FILE_MANIFEST.md).

## Publishing

[Panduan publikasi Instagram](INSTAGRAM_PUBLISHING.md) mencakup credential JSON, worker, jadwal, snapshot media dan rekonsiliasi timeout.
