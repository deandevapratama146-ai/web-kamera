# Browser Perekam

Membuka browser sungguhan dan mengenali setiap tombol yang Anda klik serta kolom yang Anda ketik
(mirip Selenium IDE). Hasilnya tampil di panel pojok kanan bawah dan bisa disalin.

## Pasang (sekali saja, di komputer Windows/Mac/Linux dengan Node.js)
```
cd perekam
npm install
npx playwright install chromium
```

## Jalankan
```
node rekam.js https://alamat-halaman
```
Klik dan ketik seperti biasa. Tiap langkah dicatat seperti ini:
```
3. KETIK kolom text "Cari produk" → "Laptop"
   selector: input[placeholder="Ketik nama produk…"]
6. KLIK tombol "Simpan"
   selector: #page-produk > div > button:nth-of-type(1)
```
- Tombol **Salin** di panel menyalin semua keterangan.
- Hasil juga tersimpan di `hasil-rekaman.txt` dan `hasil-rekaman.json`.
- Isi kolom kata sandi tidak pernah dicatat.
- Tutup browser untuk selesai.
