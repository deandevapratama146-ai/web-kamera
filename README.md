# Web Kamera & Pemeriksaan Studio

## Isi
- `index.html`, `style.css`, `app.js`: upload langsung ke repository GitHub Pages.
- `Code.gs`: backend Google Apps Script untuk menulis ke Google Spreadsheet dan menyimpan foto pemeriksaan ke Google Drive.

## Setup Google Spreadsheet
1. Buka spreadsheet target.
2. Extensions > Apps Script.
3. Tempel isi `Code.gs`, simpan.
4. Jalankan fungsi `setup()` sekali dan izinkan akses.
5. Deploy > New deployment > Web app.
6. Execute as: Me. Who has access: Anyone.
7. Salin URL `/exec`.
8. Buka GitHub Pages > Pengaturan pada aplikasi dan masukkan URL tersebut.

Sheet otomatis dibuat:
- `Pemakaian`: No, DD/MM/YY, Unit Bisnis, Durasi Pemakaian, Nama Peralatan, Tripod, Kamera, Tv, Lampu 1, Lampu 2, Laptop, Kebersihan, Keterangan.
- `Pemeriksaan Studio`: No, DD/MM/YY, Studio, Nama Perangkat, Foto, Status, Keterangan.
- `Perangkat`: daftar perangkat.

## GitHub Pages
Upload/replace 3 file web (`index.html`, `style.css`, `app.js`) ke repository. Pastikan Pages memakai branch/folder yang benar.

## Catatan kamera
Tombol foto menggunakan `capture="environment"` sehingga pada Android/iPhone browser dapat menawarkan kamera belakang. Browser tetap akan meminta izin kamera/file sesuai kebijakan perangkat.
