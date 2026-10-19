# Bahasa response IG Flow

Backend mendukung English dan Bahasa Indonesia. `languageMiddleware` membaca `Accept-Language`; default tanpa header yang didukung adalah English. Bahasa response tersedia dalam `Content-Language`. Frontend memakai bahasa default Indonesia dan mengirim preferensi melalui client API.

Pesan source ditulis dalam English. `src/core/i18n/en.json` dan `id.json` memiliki key yang sama. ApiResponse menerjemahkan message dan pesan field validation melalui helper i18n; jangan menerjemahkan status domain atau nama properti JSON.

Saat menambah pesan, tambahkan key English beserta terjemahan Indonesia, gunakan pesan tersebut pada validator/service, lalu uji `Accept-Language: id` dan fallback. Jangan mengirim error provider mentah ke pengguna; callback menyimpan safe error yang tidak membocorkan credential/detail internal.

Referensi: `src/core/middlewares/language.middleware.ts`, `src/core/helpers/i18n.ts`, `src/core/helpers/response.ts`, serta `test/language.test.ts`. UI mempunyai kamus sendiri pada frontend; kedua kamus bukan salinan satu sama lain.
