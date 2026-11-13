/*
 * Disuntikkan ke setiap halaman yang dibuka di aplikasi.
 * Mengenali elemen yang diklik/diketik lalu mengirim keterangannya ke aplikasi
 * lewat window.__rekamNative.kirim(json). Isi kolom kata sandi tidak pernah dikirim.
 */
(function () {
  if (window.__rekamAktif || !window.__rekamNative) return;
  window.__rekamAktif = true;

  var bersih = function (s) { return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80); };
  var q = function (s) { return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"'); };
  var esc = function (s) { return window.CSS && CSS.escape ? CSS.escape(s) : s; };
  var unik = function (sel) { try { return document.querySelectorAll(sel).length === 1; } catch (e) { return false; } };

  function selectorFor(el) {
    var tag = el.tagName.toLowerCase();
    if (el.id && unik('#' + esc(el.id))) return '#' + esc(el.id);
    var attrs = ['data-testid', 'data-test', 'name', 'aria-label', 'placeholder'];
    for (var i = 0; i < attrs.length; i++) {
      var v = el.getAttribute(attrs[i]);
      if (v && unik(tag + '[' + attrs[i] + '="' + q(v) + '"]')) return tag + '[' + attrs[i] + '="' + q(v) + '"]';
    }
    var parts = [];
    var n = el;
    while (n && n.nodeType === 1 && n !== document.documentElement) {
      if (n.id && unik('#' + esc(n.id))) { parts.unshift('#' + esc(n.id)); break; }
      var t = n.tagName.toLowerCase();
      var sama = n.parentElement ? Array.prototype.filter.call(n.parentElement.children, function (c) { return c.tagName === n.tagName; }) : [n];
      parts.unshift(sama.length > 1 ? t + ':nth-of-type(' + (sama.indexOf(n) + 1) + ')' : t);
      n = n.parentElement;
    }
    return parts.join(' > ');
  }

  function namaElemen(el) {
    var aria = el.getAttribute('aria-label');
    if (aria) return bersih(aria);
    var by = el.getAttribute('aria-labelledby');
    if (by) {
      var t = by.split(/\s+/).map(function (id) { var x = document.getElementById(id); return x ? x.textContent : ''; }).join(' ');
      if (bersih(t)) return bersih(t);
    }
    if (el.labels && el.labels[0]) {
      var l = el.labels[0];
      var sendiri = Array.prototype.filter.call(l.childNodes, function (c) { return c.nodeType === 3; }).map(function (c) { return c.textContent; }).join(' ');
      if (bersih(sendiri)) return bersih(sendiri);
      if (bersih(l.textContent)) return bersih(l.textContent);
    }
    if (el.placeholder) return bersih(el.placeholder);
    if (el.matches('input[type="submit"], input[type="button"]') && el.value) return bersih(el.value);
    if (!el.matches('input, textarea, select') && bersih(el.innerText)) return bersih(el.innerText);
    return bersih(el.title || el.getAttribute('name') || el.id || el.tagName.toLowerCase());
  }

  function jenisElemen(el) {
    var tag = el.tagName.toLowerCase();
    var type = (el.getAttribute('type') || '').toLowerCase();
    var role = el.getAttribute('role');
    if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'dropdown';
    if (type === 'checkbox' || role === 'checkbox') return 'kotak centang';
    if (type === 'radio' || role === 'radio') return 'pilihan radio';
    if (tag === 'textarea') return 'kolom teks panjang';
    if (tag === 'input' && ['submit', 'button', 'reset', 'image'].indexOf(type) < 0) return 'kolom ' + (type || 'teks');
    if (tag === 'a' || role === 'link') return 'tautan';
    if (role === 'menuitem' || role === 'tab' || role === 'option') return role;
    if (tag === 'button' || role === 'button' || tag === 'input') return 'tombol';
    return 'elemen';
  }

  function kirim(aksi, el, nilai) {
    var step = {
      aksi: aksi,
      jenis: jenisElemen(el),
      nama: namaElemen(el),
      selector: selectorFor(el),
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      id: el.id || '',
      name: el.getAttribute('name') || '',
      url: location.href
    };
    if (nilai !== undefined) step.nilai = nilai;
    try { window.__rekamNative.kirim(JSON.stringify(step)); } catch (e) {}
  }

  var target = function (e) { return e.composedPath ? e.composedPath()[0] : e.target; };

  // Catat isi kolom sekali saja per nilai (kata sandi selalu disamarkan).
  var terakhir = new WeakMap();
  function catatKetik(el) {
    if (terakhir.get(el) === el.value) return;
    terakhir.set(el, el.value);
    kirim('KETIK', el, el.matches('input[type="password"]') ? '(disamarkan)' : el.value);
  }

  var BISA_DIKLIK = 'button, a[href], [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"], input[type="submit"], input[type="button"], input[type="reset"], summary';

  document.addEventListener('click', function (e) {
    var t = target(e);
    if (!t || !t.closest) return;
    if (t.closest('input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, label')) return;
    var el = t.closest(BISA_DIKLIK);
    if (!el && getComputedStyle(t).cursor === 'pointer') el = t;
    if (el) kirim('KLIK', el);
  }, true);

  document.addEventListener('change', function (e) {
    var el = target(e);
    if (!el || !el.matches) return;
    if (el.matches('select')) kirim('PILIH', el, el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value);
    else if (el.matches('input[type="checkbox"], input[type="radio"]')) kirim(el.checked ? 'CENTANG' : 'HAPUS CENTANG', el);
    else if (el.matches('input, textarea')) catatKetik(el);
  }, true);

  // Di HP, kolom sering ditinggalkan tanpa event "change" (mis. langsung menekan tombol).
  document.addEventListener('blur', function (e) {
    var el = target(e);
    if (el && el.matches && el.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]), textarea') && el.value) catatKetik(el);
  }, true);

  document.addEventListener('keydown', function (e) {
    if (e.repeat || e.key !== 'Enter') return;
    var el = target(e);
    if (!el || !el.matches || !el.matches('input, select')) return;
    if (el.matches('input:not([type="checkbox"]):not([type="radio"])')) catatKetik(el);
    kirim('TEKAN ENTER', el);
  }, true);
})();
