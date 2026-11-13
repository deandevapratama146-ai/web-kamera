# project1 — Pelacak Aktivitas

Aplikasi web yang mencatat apa yang Anda lakukan di halaman:

- **Menu** yang dibuka dan dipilih (termasuk submenu)
- **Tombol** yang diklik, kotak centang, dan pilihan dropdown
- **Tombol keyboard** yang ditekan, termasuk kombinasi seperti `Ctrl + S`
- **Gerakan mouse** (posisi dan total jarak) serta jarak scroll

Isi kolom kata sandi tidak pernah dicatat; yang tercatat hanya `•`.

## Cara menjalankan
Buka `index.html` di browser. Tidak perlu server atau instalasi.

## Fitur panel "Aktivitas Saya"
- Statistik jumlah menu, tombol, keyboard, dan gerak mouse
- Daftar 5 menu/tombol yang paling sering dipakai
- Log lengkap dengan waktu, bisa difilter per jenis
- Jeda / lanjutkan perekaman, ekspor ke CSV, hapus log
- Log disimpan di browser (localStorage) sehingga tetap ada setelah halaman dimuat ulang

## Memakai pelacak di situs lain
```html
<script src="tracker.js"></script>
<script>
  const t = new ActivityTracker({ onEvent: (e) => console.log(e) });
  t.start();
</script>
```
Beri `data-track="Nama"` pada elemen supaya namanya jelas di log, `data-menu` pada wadah menu,
dan `data-track-ignore` pada bagian yang tidak ingin dicatat.

## File
- `index.html` — halaman contoh dengan menu dan tombol
- `tracker.js` — modul pelacak (bisa dipakai ulang)
- `app.js` — tampilan panel aktivitas
- `style.css` — tampilan (mendukung mode gelap)
