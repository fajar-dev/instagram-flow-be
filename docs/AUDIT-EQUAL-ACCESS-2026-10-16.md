> **Arsip audit.** Catatan ini merekam implementasi dan hasil uji pada tanggalnya; beberapa keputusan telah digantikan. Gunakan [indeks dokumentasi aktif](README.md) untuk perilaku, konfigurasi, dan prosedur saat ini.

# Equal-access and object-storage audit — 2026-10-16

## Current contract

All active authenticated users can manage users/contact data, upload and browse all content, process/retry jobs, edit/review drafts, archive unreferenced assets, read activity logs and update integration settings. Creator/uploader/reviewer IDs are retained for provenance and idempotency. They no longer restrict access. Documentation dates cannot be in the future for any user.

Removed runtime user-role enum/property, serializers, validation fields, role checks, owner filters, admin bootstrap command and config. Frontend role types, selector fields, access composable and conditional navigation are removed. Standard user authentication, inactive-account enforcement, n8n service-secret checks, private media signatures and mutation rate limits remain.

The historical role-add migration remains to preserve existing migration history. The forward removal migration deletes the column. Rollback reconstructs a legacy default column; it cannot recover discarded role assignments. Accessibility HTML `role` attributes are unrelated and remain.

## Media

Originals/previews and generated SVGs use the existing private MinIO adapter. Render metadata stores `storage_key`; response serializers never expose keys or SVG bytes. Sanitization/storage lives in the feature-owned `RenderService`; workflow transaction orchestration remains in `WorkflowService`. Failed callbacks roll back DB changes and attempt object cleanup, logging any cleanup failure.

The render migration copies and byte-verifies existing inline SVGs before removing the legacy column. MinIO failure aborts migration without dropping the source media. It can resume after MySQL partial DDL. Local filesystem adapter, import service/module/command and corresponding environment settings have been removed. No local directory existed at the configured old path when checked.

Applied both forward migrations to the active development database. Independently read all 14 asset rows' original/preview keys from MinIO: 28 objects available and original SHA256 values verified. There were no existing render rows in this database; legacy render-copy behavior is covered by migration tests. Static frontend logos/icons are application assets, not uploaded/generated media.

## Structure and UI

- Studio editor and review form extracted into separate feature components.
- User add/update fields share `UserFormFields`; photo upload remains shared.
- Jobs/review/studio queue/media/log pages share `ReportingRecordPage` and the existing `DataTable` layout.
- Removed dead actor arguments on read paths after removing owner scoping. Retained actor arguments where audit/creator metadata is written.
- Renamed the former role-policy helper to `workflow.helpers.ts`; only reusable IDs/content hashes remain there.
- Navigation checks route boundaries and chooses the most specific matching item, preventing simultaneous review/studio highlights.
- Existing header/body font scale, form/card spacing, NuxtUI theme and profile conventions remain the visual baseline.

## Verification limits

Automated suites exercise authentication, shared access, object storage, callback rollback, migration verification, serializers and frontend helpers. No live n8n publishing/Telegram dispatch is performed. Browser UAT remains blocked by the previously reported browser policy; this audit does not claim visual verification of every page.

## Final verification

- Backend: 149 tests passed, 690 assertions; TypeScript with `noUnusedLocals` and `noUnusedParameters` passed; production build passed.
- Frontend: 28 tests passed, 125 assertions; full ESLint, Nuxt typecheck and production build passed.
- Swagger parses as OpenAPI 3.0.0 with 40 paths; EN/ID locale key shapes match.
- Private MinIO SVG write/read byte comparison passed; temporary object was deleted afterward. No workflow was dispatched.
- Exact duplicate scan found no shared blocks of 12 nonempty lines over 400 characters across runtime source files (excluding migration history). This checks literal duplication, not a proof of semantic uniqueness.
- Whitespace checks passed in both repositories. Browser visual testing remains pending.
