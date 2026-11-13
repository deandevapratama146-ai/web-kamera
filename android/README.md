# Perekam Browser (Android)

Aplikasi browser untuk HP Android. Buka web apa saja; setiap tombol yang Anda tekan dan kolom yang
Anda isi dikenali dan dicatat (jenis, nama, selector), lalu bisa disalin.

## Pasang di HP
1. Unduh `PerekamBrowser.apk` dari folder ini ke HP.
2. Buka filenya. Jika diminta, izinkan "Instal aplikasi dari sumber tidak dikenal" untuk aplikasi
   yang membuka file itu (Chrome atau File Manager).
3. Play Protect mungkin menampilkan peringatan karena aplikasi ini tidak berasal dari Play Store;
   pilih "Tetap instal".

## Pakai
- Ketik alamat web atau kata pencarian di atas, lalu tekan **Buka**.
- Klik dan ketik di halaman seperti biasa. Jumlah langkah tampil di baris bawah.
- **Lihat** menampilkan daftar langkah, **Salin** menyalin semuanya, **Bagikan** mengirimnya
  lewat aplikasi lain (WhatsApp, email, dll.), **Hapus** mengosongkan daftar.

Contoh hasil:
```
3. KETIK kolom text "Cari produk" → "Laptop"
   selector: input[placeholder="Ketik nama produk…"]
   tag=input, type=text
   halaman: https://contoh.com/produk
```

## Catatan
- Isi kolom kata sandi tidak pernah dicatat, hanya ditulis "(disamarkan)".
- Elemen di dalam iframe tidak terekam.
- Butuh Android 5.0 ke atas.

## Build ulang
```
ANDROID_HOME=/lokasi/android-sdk ./build.sh
```
Butuh JDK 17+ serta `platforms;android-34` dan `build-tools;35.0.0`. APK ditandatangani dengan kunci
debug yang dibuat otomatis; jika kuncinya berbeda dari versi yang sudah terpasang, hapus dulu
aplikasi lama di HP sebelum memasang yang baru.
