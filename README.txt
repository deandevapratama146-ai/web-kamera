# Web Input Kamera → Google Sheets

## Isi ZIP
- `index.html` — web yang bisa di-host di GitHub Pages.
- `google-apps-script.gs` — API untuk menerima data dan menyimpan foto ke Google Drive.

## 1. Buat Google Sheet
Buat header:
Waktu | Nama | No HP | Keterangan | Foto

## 2. Buat folder Google Drive
Buat folder khusus untuk foto. Salin ID folder dari URL Drive.

## 3. Google Apps Script
Buka Extensions → Apps Script dari Google Sheet.
Tempel isi `google-apps-script.gs`.

Ganti:
SHEET_ID = ID Google Sheet
FOLDER_ID = ID folder Google Drive

Deploy → New deployment → Web app
Execute as: Me
Who has access: Anyone

Salin URL Web App.

## 4. Hubungkan web
Buka `index.html` dan ganti:
PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI

## 5. Upload ke GitHub Pages
Upload `index.html` ke repository GitHub.
Settings → Pages → Deploy from branch → main → /root.

Kamera membutuhkan HTTPS. GitHub Pages sudah HTTPS.

Catatan:
- Browser akan meminta izin kamera.
- Foto dikirim sebagai base64 ke Apps Script lalu disimpan ke Google Drive.
- Untuk penggunaan besar, sebaiknya gunakan backend/storage yang lebih khusus.
