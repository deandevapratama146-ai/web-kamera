# Web Kamera Studio - FINAL V5

## Menu
- Dashboard
- Pemakaian & Pemeriksaan (digabung menjadi satu transaksi)
- Laporan
- Master Data

## Master Data
- Unit Bisnis
- Studio
- Barang / Peralatan
- Durasi Pemakaian

## Satu transaksi
Pengguna memilih:
Tanggal + Unit Bisnis + Studio + Durasi + Keterangan,
kemudian memeriksa perangkat yang dipakai:
Foto kamera + OK/TIDAK OK + Keterangan.

Data transaksi masuk ke sheet `Transaksi`.
Detail perangkat masuk ke sheet `Pemeriksaan`.
Foto disimpan di Google Drive folder `Web Kamera - Foto Pemeriksaan`.

## Deploy
1. Paste `Code.gs` ke Apps Script.
2. Deploy sebagai Web app.
3. Execute as: Me.
4. Who has access: Anyone.
5. Jika mengganti Code.gs, buat versi deployment baru.
6. Upload `index.html`, `style.css`, `app.js` ke root GitHub Pages.
