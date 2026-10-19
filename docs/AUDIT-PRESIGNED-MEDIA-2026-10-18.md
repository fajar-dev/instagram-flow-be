> **Arsip audit.** Catatan ini merekam implementasi dan hasil uji pada tanggalnya; beberapa keputusan telah digantikan. Gunakan [indeks dokumentasi aktif](README.md) untuk perilaku, konfigurasi, dan prosedur saat ini.

# MinIO presigned media — 2026-10-18

- Reuse the existing MinIO helper, credentials and private bucket for n8n preview URLs.
- Remove MEDIA_SIGNING_SECRET, HMAC media token generation/verification, and /api/media-access.
- The manifest awaits URL generation and shares one preview URL between aiImageUrl/renderImageUrl. Originals are not included.
- SVG validation compares the source origin/path against the selected preview object URL and embeds trusted stored bytes. It never fetches the callback URL. Query/signature differences do not change the selected object.
- Keep SIGNED_MEDIA_URL_TTL_SECONDS for expiry. Avatar presigned URL behavior stays unchanged.
- Readiness now checks storageConfigured instead of the removed signed-media secret/API media URL flags.
- MinIO endpoint must be reachable by n8n/image consumers. A presigned host cannot be rewritten after signing.
- Existing issued URLs expire normally; old manifests referencing /api/media-access must be fetched again.
- Application database and existing objects were not migrated or deleted.

Live MinIO verification succeeded: a temporary preview was uploaded, its presigned URL returned identical bytes, a modified signature returned HTTP 403, and the temporary object was deleted.
