# Istilah fitur IG Flow

Gunakan istilah berdasarkan tanggung jawabnya, termasuk pada variabel, module, kontrak API dan UI. Istilah teknis yang berbeda tidak perlu dipaksa menjadi sinonim.

| Istilah | Makna dan pemilik |
| --- | --- |
| Project / Batch | Project adalah label pengguna untuk satu kelompok upload. Batch adalah aggregate teknis dengan batchId; kesamaan projectName tidak berarti project yang sama. |
| Asset | Foto sumber yang diunggah; bukan hasil desain AI. Milik content/media. |
| Job / attempt | Satu percobaan pemrosesan AI. Retry membuat attempt baru; daftar memakai attempt terbaru. |
| Execution | Eksekusi workflow di n8n, dikenali executionId. Berbeda dari jobId dan eventId outbox. |
| Render | Gambar hasil edit AI. Feed memilih renderIds berurutan; foto pertama menjadi cover. |
| Draft | Konten hasil AI yang dapat disesuaikan pada form publish. Tidak ada riwayat revisi aktif. |
| READY_FOR_REVIEW | Siap diputuskan: Publish atau Reject. Review adalah tahap pemeriksaan, bukan entity keputusan. |
| Rejection / rejectedBy | Catatan penolakan dan ID pengguna yang menolak. decisionStatus pada draft menyatakan hasil keputusan. |
| PUBLISH | Draft telah masuk alur publikasi. Belum berarti Instagram sudah menayangkan post. |
| Publication / PUBLISHED | Record antrean dan snapshot final; status PUBLISHED berarti delivery berhasil. createdBy adalah pengaju publikasi; publishedAt adalah waktu delivery. |
| Cancel | Membatalkan antrean yang diizinkan; tercatat sebagai aksi pembatalan, bukan menukar identitas pengaju menjadi penolak. |
| Retry publication | Memakai record, akun dan snapshot yang sama; berbeda dari retry job AI. |
| Output / placement | Output dipilih saat upload: feed atau story. Placement adalah tujuan publikasi dan wajib sama dengan output job. |
| Settings / AI dispatcher | Settings adalah menu/modul konfigurasi. Dispatcher mengirim job ke n8n; sakelarnya tidak menghentikan worker publikasi. |
| Instagram account / User | Akun Instagram adalah tujuan posting dari JSON privat. User adalah pengguna aplikasi yang login; keduanya bukan identitas yang sama. |
| Account period | Today, This week, This month dalam WIB; pembanding memakai bagian berjalan periode sebelumnya. |
| Post insights / Top posts | Metrik lifetime postingan. Periode akun tidak memfilter Top posts. |
| Analytics cache | Data sementara di Redis, bukan penyimpanan credential atau antrean jadwal publikasi. |

Nama database/bucket/container deployment yang sudah dikonfigurasi adalah identitas infrastruktur, bukan label UI; jangan menggantinya hanya untuk perubahan terminologi. Baseline development langsung memakai nama schema final; database lama tidak otomatis kompatibel dengan baseline baru. Arsip audit menjelaskan kondisi pada tanggalnya, bukan kontrak aktif.
