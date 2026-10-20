# Penerapan output tunggal — 21 Oktober 2026

> Catatan historis pelaksanaan, bukan pengganti [runbook n8n](../../operations/n8n.md) atau [panduan database](../../operations/database.md).

## Perubahan runtime

- Backup SQL database aplikasi dibuat di direktori privat `/Users/fajar/.codex/backups/ig-flow/` sebelum migration.
- Workflow sebelumnya dan config n8n dicadangkan di direktori privat `/root/ig-flow-backups/` pada festrack.
- Tidak ada execution/job aktif atau publication tertunda saat upgrade. Dispatcher dinonaktifkan sementara dan dikembalikan ke enabled setelah upgrade.
- Migration `SingleJobOutput1792540800000` berhasil; ledger menjadi 14 migration dengan 13 tabel aplikasi. Delapan job lama menjadi output Feed, mengikuti data sebelumnya.
- Workflow `igFlowContentV3` diimpor, dipublikasikan dan container n8n direstart. Parameter Configuration, webhook dan referensi credential tetap sama.
- Tunnel callback lokal port 4000 → server loopback 14000 dipulihkan. Backend tetap lokal sesuai keputusan pengguna.
- Worker AI dan publishing dijalankan sebagai proses lokal. Tidak menambahkan autostart; proses ini tetap bergantung pada MacBook aktif.

## Verifikasi

Backend health dan n8n health mengembalikan 200. Dua konten sintetis berhasil melewati upload → dispatch → claim → analisis → result:

| Output | Job | Hasil |
| --- | --- | --- |
| Feed | a6f2e75a-4623-4164-b240-ab0287250c93 | READY_FOR_REVIEW; satu render 1080×1350; caption tersedia |
| Story | 5ccdf189-5341-4bac-8c4e-773990e38d8e | READY_FOR_REVIEW; satu render 1080×1920; caption kosong |

Konten uji diberi nama `Single output verification … 2026-10-21` dan dibiarkan untuk inspeksi di Content. Tidak ada publikasi Instagram yang dikirim selama verifikasi.

MySQL sempat memiliki 150 koneksi idle aplikasi. Setelah proses backend lama berhenti dan backend berjalan kembali, koneksi kembali normal. Tidak melakukan KILL massal koneksi atau restart database. Pengujian ulang `content-workflow.test.ts` lulus 25 tes; suite lengkap sebelumnya lulus 185 tes backend dan 52 tes frontend.

## Konsolidasi baseline sesudah penerapan

Atas permintaan pengguna karena aplikasi belum production, migration output tunggal kemudian digabung ke create-jobs. Baseline final kembali menjadi 13 migration untuk 13 tabel. Backup tambahan dibuat sebelum rekonsiliasi. Schema aplikasi dibandingkan dengan database test hasil baseline final: kolom, indeks, foreign key, aturan referensi dan tabel/collation seluruhnya cocok. Entry transisi di ledger dihapus dalam transaksi; jumlah baris seluruh tabel aplikasi tidak berubah, termasuk 10 job, 7 draft dan 3 publication.

`migration:show` menampilkan 13 entry applied tanpa pending migration. Suite backend lulus 184 tes (test transisi dihapus), termasuk fresh schema dan rollback/reapply. Typecheck, lint, build, serta pemeriksaan whitespace lulus.
