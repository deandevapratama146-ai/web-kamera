# Web Kamera & Studio

Paket siap upload ke GitHub Pages.

## Backend sudah terpasang
URL Google Apps Script Web App sudah diisi di `app.js`.

Fungsi:
- Input pemakaian peralatan
- Kolom sesuai format spreadsheet
- Tambah/hapus perangkat
- Tambah/hapus studio
- Pemeriksaan tiap perangkat: OK / TIDAK OK
- Foto langsung dari kamera HP
- Keterangan per perangkat
- Foto disimpan ke Google Drive dan URL masuk ke Google Sheet

## Upload GitHub Pages
1. Ekstrak ZIP.
2. Upload `index.html`, `style.css`, dan `app.js` ke repository GitHub Pages.
3. Jika menggunakan GitHub web: Add file -> Upload files.
4. Pastikan file berada di root repository.
5. Tunggu GitHub Pages selesai build.

## Google Apps Script
Apps Script harus menggunakan isi `Code.gs` pada project yang sudah dideploy.
Jika `Code.gs` diubah, lakukan Deploy -> Manage deployments -> Edit -> New version -> Deploy.

## Catatan
Data perangkat dan nama studio tersimpan di browser perangkat tersebut melalui localStorage. Data transaksi/pemeriksaan dikirim ke Google Spreadsheet.
