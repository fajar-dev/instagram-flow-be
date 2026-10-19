# Kontrak OpenAPI IG Flow

`swagger.yaml` adalah spesifikasi API yang disajikan pada `/api/swagger.yaml`; UI tersedia pada `/api/docs`. Implementasi route terpusat di `src/routes/api.ts`. Perubahan route/validator/serializer harus diikuti pembaruan spesifikasi.

Saat mengubah endpoint, cocokkan method/path, autentikasi, parameter query/path, request body, response success/error, pagination, binary media, dan konflik revisi. Gunakan kembali schema response bersama. Jangan menambahkan tag atau schema fitur yang sudah dihapus.

Perhatikan perbedaan kontrak: API dashboard memakai envelope ApiResponse; callback sukses n8n memakai format flat sesuai adapter; media dapat berupa binary. Jangan mendokumentasikan callback sebagai endpoint publik hanya karena tidak memakai JWT user: callback tetap membutuhkan service token.

Validasi YAML, seluruh `$ref` internal, serta kesesuaian daftar path dengan `src/routes/api.ts` sebelum commit perubahan kontrak. Pengujian response ada pada suite API; tampilan Swagger saja tidak membuktikan kontrak sudah benar.
