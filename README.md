# Web Kamera - GitHub Pages + Google Sheets

Paket ini menggunakan GitHub Pages sebagai frontend dan Google Apps Script sebagai backend.

## URL Apps Script
URL sudah dipasang di `app.js`.

## Upload ke GitHub
Upload isi folder `web-kamera-package` ke root repository sehingga `index.html` berada langsung di root.

## Penting
Google Apps Script Web App tidak menyediakan CORS header yang dapat dibaca frontend. Karena itu frontend mengirim POST dengan `mode: no-cors` dan `text/plain`. Browser tidak dapat membaca balasan server, jadi aplikasi menampilkan status terkirim setelah request selesai. Cek Google Sheet untuk memastikan data masuk.

## Sheet yang dibuat otomatis
- Pemakaian
- Pemeriksaan Studio
- Perangkat

Foto pemeriksaan disimpan ke Google Drive dan URL file dicatat di sheet `Pemeriksaan Studio`.
