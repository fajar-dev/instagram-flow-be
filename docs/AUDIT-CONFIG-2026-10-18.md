# Audit config dan environment — 2026-10-18

## Temuan dan perubahan

- API_KEY adalah dead configuration: apiKeyMiddleware tidak diregistrasikan di route atau diimpor modul mana pun. Config sebelumnya mewajibkan key ini di production meskipun tidak melindungi endpoint. Hapus config.app.apiKey, middleware, dan key pada .env/.env.dist; dokumentasi diperbarui.
- Autentikasi JWT dan Bearer service token n8n tetap aktif. Test startup production memastikan kedua JWT secret masih wajib tanpa API_KEY.
- GOOGLE_CLIENT_SECRET tetap diperlukan oleh AuthHelper.verifyGoogleCode untuk menukar authorization code, bukan hanya memverifikasi ID token.
- DB_ROOT_PASS adalah pengaturan Docker MySQL, bukan runtime aplikasi. DB_TEST_NAME dipakai test setup dengan perlindungan database *_test. Keduanya bukan dead config.
- Template backend hanya .env.dist; template frontend .env.example. Keduanya milik aplikasi berbeda. Tidak ada key duplikat atau key tanpa consumer yang ditemukan setelah pembersihan.
- Frontend API_BASE_URL digunakan saat konfigurasi Nuxt; NUXT_PUBLIC_API_URL adalah override runtime Nuxt yang sah. GOOGLE_CLIENT_ID frontend dipakai SDK, sedangkan backend memakainya sebagai audience OAuth. Pengulangan lintas aplikasi ini diperlukan.
- SMTP config membangun transporter; database config membangun DataSource; app.config.ts frontend mengatur UI, nuxt.config.ts mengatur framework/runtime. File-file ini bukan duplikasi.
- Nilai secret tidak dicatat atau dicetak selama audit. Tidak ada credential baru atau integrasi eksternal yang diaktifkan.

## Verifikasi

Jalankan suite backend, typecheck, build, dan docker compose config --quiet. Tidak perlu menjalankan ulang build frontend untuk perubahan newline template tanpa perubahan kode frontend.
