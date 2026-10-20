# Peta source otomasi konten IG Flow

Peta ini menunjuk direktori pemilik fitur, bukan salinan daftar semua file yang mudah tertinggal. Path backend relatif ke root backend; path frontend relatif ke root frontend.

| Fitur | Backend | Frontend |
| --- | --- | --- |
| Batch/upload/media | src/modules/content/ | app/components/content/, app/composables/content/, app/services/content/ |
| Job dan workflow | src/modules/ai-job/ | app/services/ai-job/, app/pages/content/[jobId]/ |
| Review | src/modules/content-review/ | app/components/content-review/, app/services/content-review/ |
| Publish | src/modules/publishing/ | app/components/publishing/, app/composables/publishing/ |
| Overview/list/audit | src/modules/reporting/ | app/components/reporting/, app/composables/reporting/, app/services/reporting/ |
| Dispatcher settings | src/modules/integration/ | app/pages/settings.vue, app/services/integration/ |
| Transaksi bersama | src/modules/shared/ | app/types/, app/util/ |
| Worker | src/commands/job-dispatch.ts | Tidak berjalan di browser |
| Workflow deploy | integrations/n8n/ | Tidak menyimpan credential n8n |
| Persistence | src/database/migrations/, src/database/seeders/ | Tidak menjalankan migration/seeder |

Entry route backend: `src/routes/api.ts`. Navigasi frontend: `app/composables/useNavigation.ts`. Status tab: `app/util/content-tabs.ts`. Lightbox: `app/composables/useLightbox.ts` dan `app/components/ImageLightbox.vue`.

Panduan aktif: [implementasi](IMPLEMENTATION.md), [arsitektur](../ARCHITECTURE.md), [overview frontend](../../../frontend/docs/project-overview.md). Catatan refactor bertanggal merupakan arsip, bukan inventaris source saat ini.
