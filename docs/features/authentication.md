# Autentikasi

Login password, Google dan Microsoft menghasilkan kontrak sesi yang sama: user, accessToken dan refreshToken. Login sosial hanya menerima email akun yang sudah terdaftar dan aktif; tidak membuat pengguna otomatis. Microsoft memakai identitas dari respons MSAL dan pencocokan email pengguna lokal, bukan provisioning atau sinkronisasi Microsoft Graph.

## Microsoft popup

1. Klik login membuka popup sebelum operasi asynchronous agar tidak diblokir browser.
2. Browser membuat state acak dan PKCE S256 per percobaan. Verifier hanya disimpan dalam memori halaman pembuka.
3. Callback `/auth/microsoft/callback` menghapus parameter URL lalu meneruskan code/state ke opener melalui postMessage pada origin yang sama. Callback tidak menukar token atau menyimpan sesi.
4. Opener memeriksa origin, sumber window dan state, menutup popup, lalu POST `/api/auth/microsoft` dengan `code` dan `codeVerifier`.
5. MicrosoftAuthAdapter menukar code memakai secret dan redirect URI server melalui MSAL Node. AuthService memakai pemeriksaan akun aktif yang sama dengan Google. Controller memakai serializer sesi bersama.

Popup ditutup pengguna dianggap pembatalan. Popup diblokir atau timeout lima menit menampilkan pesan yang dapat ditindaklanjuti. Listener/timer dibersihkan saat selesai atau halaman ditinggalkan. Tidak ada fallback code dari query sign-in, state sessionStorage, permintaan User.Read atau panggilan Graph /me.

## Konfigurasi Entra

- Daftarkan redirect URI sebagai platform **Web**, karena penukaran kode dilakukan oleh confidential client di backend menggunakan client secret. Jangan ubah ke SPA untuk flow ini.
- URI harus persis sama pada Entra, backend dan frontend; development: `http://localhost:3000/auth/microsoft/callback`.
- Backend: MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MICROSOFT_TENANT_ID, MICROSOFT_REDIRECT_URI.
- Frontend: client ID, tenant ID dan redirect URI yang sama, **tanpa client secret**. Jika redirect URI kosong, backend menggunakan FRONTEND_URL dan frontend origin aktif dengan path callback tersebut.
- Gunakan tenant organisasi untuk deployment internal; tipe akun aplikasi Entra harus cocok dengan tenant yang dikonfigurasi. Scope hanya openid/profile/email.
- Callback harus mempertahankan window.opener; hindari header Cross-Origin-Opener-Policy same-origin yang memutus popup OAuth. Gunakan kebijakan yang mendukung popup pada halaman login/callback.

Tes otomatis memverifikasi kontrak, PKCE, origin/source/state, cleanup popup serta penanganan error. Login nyata masih memerlukan akses interaktif akun Microsoft dan konfigurasi Entra yang sesuai.

Referensi: [Authorization code flow Microsoft](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow).

## Struktur modul

- `auth.controller.ts`: input HTTP dan respons sesi bersama.
- `auth.service.ts`: aturan akun serta penerbitan sesi.
- `auth.module.ts`: wiring repository, mailer dan kedua adapter OAuth.
- `adapters/`: GoogleAuthAdapter dan MicrosoftAuthAdapter untuk komunikasi provider.
- `interfaces/`: kontrak verifier provider serta repository reset password.
- `helpers/session-tokens.ts`: penerbitan JWT aplikasi, terpisah dari integrasi OAuth.
- `validators/`, `serializers/`, `entities/`, `repositories/`: tetap mengikuti struktur modul User.

Helper autentikasi lama di core dihapus; seluruh implementasi spesifik login berada di modul auth.
