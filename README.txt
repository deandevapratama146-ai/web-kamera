# Web Kamera → Google Sheets

Google Sheet ID sudah dimasukkan:
1-Du8e4omNwqm-mCtP-n8dCw66mWgiCwlWMmdKSYja8M

## A. Google Apps Script
1. Buka Google Sheet.
2. Extensions → Apps Script.
3. Tempel isi `google-apps-script.gs`.
4. Buat folder Google Drive untuk foto.
5. Salin ID folder dan isi `FOLDER_ID`.
6. Deploy → New deployment → Web app.
7. Execute as: Me.
8. Who has access: Anyone.
9. Salin URL Web App.

## B. Hubungkan GitHub Pages
Buka `index.html`.
Ganti:
PASTE_URL_GOOGLE_APPS_SCRIPT_DI_SINI
dengan URL Web App.

Commit perubahan.

## C. GitHub Pages
Settings → Pages → Deploy from branch → main → / (root) → Save.

Kamera membutuhkan HTTPS. GitHub Pages sudah HTTPS.

Kolom Sheet:
Waktu | Nama | No HP | Keterangan | Foto
