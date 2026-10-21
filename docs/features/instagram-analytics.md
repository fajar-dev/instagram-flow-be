# Instagram analytics

Analytics adalah child modul Instagram (`src/modules/instagram/analytics`). Controller, service, adapter dan validator terpisah; semua route berada di `src/routes/api.ts`. Transport Graph bersama dipakai publishing dan analytics, tanpa menggandakan parsing credential atau request HTTP. Service bergantung pada interface API dan repository untuk lookup publikasi.

## Akses dan endpoint

Semua endpoint membutuhkan autentikasi aplikasi. Akun berasal dari JSON privat yang sama dengan publishing; membutuhkan Instagram Login dengan `instagram_business_basic` dan `instagram_business_manage_insights`.

- `GET /instagram/accounts/:accountKey/insights?period=today|this_week|this_month|last_7_days|last_30_days`: total views, reach dan interactions untuk rentang berjalan tersebut.
- `GET /instagram/accounts/:accountKey/media?after=...`: 20 postingan per halaman dari akun, termasuk postingan di luar IG Flow. Cursor opaque dikembalikan sebagai `after`; URL paging provider tidak dikembalikan. Tidak memakai filter periode akun.
- `GET /instagram/accounts/:accountKey/media/:mediaId/insights`: statistik lifetime. Kepemilikan dibandingkan dengan profil token (ID scoped aplikasi dan user_id).
- `GET /publications/:publicationId/insights`: lookup repository, wajib PUBLISHED dengan media ID dan akun yang sama dengan snapshot publikasi.

Feed/Reels menampilkan views, reach, likes, comments, saved, shares, total_interactions. Story memakai views, reach, replies, navigation. `null` berarti data tidak tersedia, berbeda dari angka 0. Error permission/token menghasilkan error aplikasi yang aman; pesan provider dan token tidak diteruskan. Metrik unsupported atau Story belum cukup viewers tetap null.

## Cache dan batasan

Cache Redis lima menit sejak pengambilan selesai, dibagi antar-instance dalam environment yang sama. Key analytics di-hash dan dipisahkan berdasarkan akun, Instagram user ID, periode/cursor/media serta versi kontrak. Promise lokal hanya hidup selama request berjalan, bukan penyimpanan hasil. Akun tetap diperiksa setiap request sebelum memakai cache. Tidak ada tabel atau migration baru: ini menampilkan data yang tersedia di Meta, bukan arsip historis permanen. Data dapat terlambat hingga 48 jam; Story mempunyai jendela akses singkat. Daftar `/media` mengikuti Feed/Reels yang dikembalikan Meta; Story yang dipublikasikan IG Flow dapat dibaca melalui detail Content selama masih tersedia. Tidak membuat webhook, worker, atau postingan baru. Instagram Login tidak mendukung webhook Insights.

Untuk riwayat panjang yang melampaui retensi Meta, diperlukan snapshot terjadwal terpisah; fitur ini tidak mengklaim menyediakan histori tersebut. Lock Redis berumur 120 detik menggabungkan cache miss antar-instance. Request lain menunggu maksimal 10 detik sebelum mengambil langsung ke Meta; ini optimasi cache, bukan jaminan exactly-once. Pemilik lock yang kedaluwarsa tidak boleh menimpa hasil baru atau menghapus lock penggantinya. Jika Redis tidak tersedia, request mengambil data langsung; error Meta tetap diteruskan dan tidak disimpan. Timeout koneksi 1,5 detik dan command 2 detik; koneksi dicoba lagi pada request berikutnya. Konfigurasi Redis tersedia di [environment](../operations/environment.md).

## Verifikasi

Uji adapter mencakup null/zero, pemilihan metrik Story, kepemilikan media, permission error, sanitasi paging; service diuji untuk cache dan status/identitas publikasi. Verifikasi read-only menggunakan credential development berhasil membaca analytics akun dan Feed. Tidak ada publikasi nyata yang dibuat oleh pengujian ini. Seluruh 172 tes backend, lint, typecheck dan build lulus. Pengujian read-only akun 7/30 hari dan insight publikasi database berhasil menggunakan credential development.

Referensi resmi:
- https://developers.facebook.com/documentation/instagram-platform/insights
- https://developers.facebook.com/documentation/instagram-platform/api-reference/instagram-user/insights
- https://developers.facebook.com/documentation/instagram-platform/reference/instagram-media/insights

## Tambahan metrik dan peringkat — 20 Oktober 2026

Credential beta_dev12 diuji read-only pada Graph v24.0. Metrik akun tambahan yang mengembalikan angka: accounts_engaged, likes, comments, saves, shares, replies, reposts, profile_links_taps. Feed mendukung follows, profile_visits, profile_activity. follows_and_unfollows kosong dan metrik Reels tidak didukung pada Feed yang diuji, sehingga tidak ditambahkan. Ini bukan jaminan semua akun/jenis media akan memiliki data; nilai tidak tersedia tetap null.

Engagement rate dihitung sebagai total_interactions / reach × 100, dibulatkan dua desimal. Reach nol/null atau interaksi null menghasilkan null. Interaksi nol dengan reach positif menghasilkan 0%. Nilai dapat melebihi 100 karena bukan persentase akun unik. Persentase tidak dicampur ke radial chart; chart membandingkan views, reach dan total_interactions, metrik lainnya tetap berupa angka.

Endpoint GET /instagram/accounts/:accountKey/top-posts menerima cursor after dan mengembalikan maksimal 20 media per request beserta cursor berikutnya. Frontend memuat seluruh halaman bertahap, deduplikasi ID, mengurutkan semua postingan berdasarkan interaksi lalu reach, dan menjaga pergantian akun dari respons lama. Null tetap ditampilkan, diurutkan terakhir. Jika request gagal, data yang sudah dimuat dipertahankan dan tombol coba lagi melanjutkan cursor yang sama. Tidak ada lagi batas lima terbaik atau 20 total.

## Periode kalender

Pilihan Today, This week, This month, Last 7 days dan Last 30 days memakai batas hari Asia/Jakarta (WIB). Minggu dimulai Senin; bulan dimulai tanggal 1; semua rentang berakhir pada waktu pengambilan data. Rentang 7/30 hari mencakup hari ini. Default This week. Cache memasukkan awal rentang agar tidak memakai data rentang kemarin saat berganti hari/minggu/bulan. Top posts tetap memakai angka lifetime dan tidak difilter periode akun.

## Radar akun

Hanya statistik akun memakai RadarChart, membandingkan periode terpilih dengan bagian berjalan periode sebelumnya. Today bergeser satu hari, This week tujuh hari, This month mulai tanggal 1 bulan sebelumnya (dibatasi akhir bulan jika lebih pendek), last7/last30 bergeser 7/30 hari. Rentang aktual ditampilkan pada UI. Setiap sumbu (reach, likes, comments, saves, shares, engagement rate) dinormalisasi terhadap maksimum kedua periode; maksimum menjadi 100. Nol tidak dianggap data hilang, null tidak diplot. Minimal tiga sumbu tersedia untuk radar. Nilai asli kedua periode tetap ditampilkan. Insight Content tetap radial tanpa pembanding.

Respons Graph divalidasi menggunakan schema Zod sebelum masuk domain. Payload rusak tidak diubah menjadi metrik nol/kosong. Error domain (misalnya kepemilikan media 403) dipertahankan; error upstream dikembalikan sebagai 502 dengan pesan aman. Hanya hasil sukses disimpan di Redis; release lock memeriksa token pemilik secara atomik.
