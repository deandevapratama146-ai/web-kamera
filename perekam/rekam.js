/*
 * rekam.js — browser perekam (seperti Selenium IDE).
 *
 * Membuka browser sungguhan. Setiap kali Anda mengklik atau mengetik,
 * elemen yang dipakai dikenali (tombol apa, kolom apa, selector-nya)
 * dan dicatat di panel pojok kanan bawah serta di file:
 *   hasil-rekaman.txt   (keterangan siap salin)
 *   hasil-rekaman.json  (data lengkap)
 *
 * Pemakaian:  node rekam.js https://alamat-halaman
 * Isi kolom kata sandi tidak pernah dicatat.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

// ---------- Kode yang berjalan di dalam halaman ----------
function inject() {
  if (window.__rekamAktif) return;
  window.__rekamAktif = true;
  const PANEL_ID = '__rekam_panel';

  const bersih = (s) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const q = (s) => String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const unik = (sel) => { try { return document.querySelectorAll(sel).length === 1; } catch (_) { return false; } };

  function selectorFor(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id && unik('#' + CSS.escape(el.id))) return '#' + CSS.escape(el.id);
    for (const a of ['data-testid', 'data-test', 'name', 'aria-label', 'placeholder']) {
      const v = el.getAttribute(a);
      if (v && unik(`${tag}[${a}="${q(v)}"]`)) return `${tag}[${a}="${q(v)}"]`;
    }
    const parts = [];
    let n = el;
    while (n && n.nodeType === 1 && n !== document.documentElement) {
      if (n.id && unik('#' + CSS.escape(n.id))) { parts.unshift('#' + CSS.escape(n.id)); break; }
      const t = n.tagName.toLowerCase();
      const sama = n.parentElement ? Array.from(n.parentElement.children).filter((c) => c.tagName === n.tagName) : [n];
      parts.unshift(sama.length > 1 ? `${t}:nth-of-type(${sama.indexOf(n) + 1})` : t);
      n = n.parentElement;
    }
    return parts.join(' > ');
  }

  function namaElemen(el) {
    const aria = el.getAttribute('aria-label');
    if (aria) return bersih(aria);
    const by = el.getAttribute('aria-labelledby');
    if (by) {
      const t = by.split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || '').join(' ');
      if (bersih(t)) return bersih(t);
    }
    if (el.labels && el.labels[0]) {
      const l = el.labels[0];
      const sendiri = Array.from(l.childNodes).filter((c) => c.nodeType === 3).map((c) => c.textContent).join(' ');
      if (bersih(sendiri)) return bersih(sendiri);
      if (bersih(l.textContent)) return bersih(l.textContent);
    }
    if (el.placeholder) return bersih(el.placeholder);
    if (el.matches('input[type="submit"], input[type="button"]') && el.value) return bersih(el.value);
    if (!el.matches('input, textarea, select') && bersih(el.innerText)) return bersih(el.innerText);
    return bersih(el.title || el.getAttribute('name') || el.id || el.tagName.toLowerCase());
  }

  function jenisElemen(el) {
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    const role = el.getAttribute('role');
    if (tag === 'select' || role === 'combobox' || role === 'listbox') return 'dropdown';
    if (type === 'checkbox' || role === 'checkbox') return 'kotak centang';
    if (type === 'radio' || role === 'radio') return 'pilihan radio';
    if (tag === 'textarea') return 'kolom teks panjang';
    if (tag === 'input' && !['submit', 'button', 'reset', 'image'].includes(type)) return 'kolom ' + (type || 'teks');
    if (tag === 'a' || role === 'link') return 'tautan';
    if (role === 'menuitem' || role === 'tab' || role === 'option') return role;
    if (tag === 'button' || role === 'button' || tag === 'input') return 'tombol';
    return 'elemen';
  }

  function info(el) {
    return {
      jenis: jenisElemen(el),
      nama: namaElemen(el),
      selector: selectorFor(el),
      tag: el.tagName.toLowerCase(),
      type: el.getAttribute('type') || '',
      id: el.id || '',
      name: el.getAttribute('name') || '',
    };
  }

  const diPanel = (e) => e.composedPath().some((n) => n.id === PANEL_ID);
  const kirim = (step) => window.__rekamKirim && window.__rekamKirim(step);

  // Catat isi kolom sekali saja per nilai (kata sandi selalu disamarkan).
  const terakhir = new WeakMap();
  function catatKetik(el) {
    if (terakhir.get(el) === el.value) return;
    terakhir.set(el, el.value);
    kirim({ aksi: 'KETIK', ...info(el), nilai: el.matches('input[type="password"]') ? '(disamarkan)' : el.value });
  }

  const BISA_DIKLIK = 'button, a[href], [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="option"], [role="checkbox"], [role="radio"], input[type="submit"], input[type="button"], input[type="reset"], summary';

  document.addEventListener('click', (e) => {
    if (diPanel(e)) return;
    const t = e.composedPath()[0];
    if (!t || !t.closest) return;
    if (t.closest('input:not([type="submit"]):not([type="button"]):not([type="reset"]), textarea, select, label')) return; // dicatat saat nilainya berubah
    let el = t.closest(BISA_DIKLIK);
    if (!el && getComputedStyle(t).cursor === 'pointer') el = t;
    if (!el) return;
    kirim({ aksi: 'KLIK', ...info(el) });
  }, true);

  document.addEventListener('change', (e) => {
    if (diPanel(e)) return;
    const el = e.composedPath()[0];
    if (!el || !el.matches) return;
    if (el.matches('select')) {
      kirim({ aksi: 'PILIH', ...info(el), nilai: el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : el.value });
    } else if (el.matches('input[type="checkbox"], input[type="radio"]')) {
      kirim({ aksi: el.checked ? 'CENTANG' : 'HAPUS CENTANG', ...info(el) });
    } else if (el.matches('input, textarea')) {
      catatKetik(el);
    }
  }, true);

  document.addEventListener('keydown', (e) => {
    if (diPanel(e) || e.repeat || e.key !== 'Enter') return;
    const el = e.composedPath()[0];
    if (!el || !el.matches || !el.matches('input, select')) return;
    if (el.matches('input:not([type="checkbox"]):not([type="radio"])')) catatKetik(el); // isian dicatat sebelum Enter
    kirim({ aksi: 'TEKAN ENTER', ...info(el) });
  }, true);

  // ---------- Panel di pojok kanan bawah (hanya di halaman utama) ----------
  if (window.top !== window) return;

  function baris(s) {
    let t = `${s.no}. ${s.aksi} ${s.jenis} "${s.nama}"`;
    if (s.nilai !== undefined) t += ` → "${s.nilai}"`;
    return t + `\n   selector: ${s.selector}`;
  }

  function pasang() {
    if (document.getElementById(PANEL_ID)) return;
    const host = document.createElement('div');
    host.id = PANEL_ID;
    host.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:2147483647;';
    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>
        .box{width:340px;font:13px system-ui,sans-serif;background:#1b1f27;color:#e6e8ec;border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.4);overflow:hidden}
        .head{display:flex;align-items:center;gap:6px;padding:8px 10px;background:#2b313c}
        .head b{flex:1}.dot{width:8px;height:8px;border-radius:50%;background:#ef6b6b}
        button{font:inherit;font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid #4a5263;background:#1b1f27;color:#e6e8ec;cursor:pointer}
        button:hover{border-color:#5b8cff}
        pre{margin:0;padding:8px 10px;max-height:240px;overflow:auto;white-space:pre-wrap;word-break:break-word;font:12px ui-monospace,monospace}
        .min pre{display:none}.msg{color:#34d399;font-size:11px}
      </style>
      <div class="box"><div class="head"><span class="dot"></span><b>Perekam · <span id="n">0</span> langkah</b>
        <span class="msg" id="msg"></span>
        <button id="salin">Salin</button><button id="hapus">Hapus</button><button id="min">–</button></div>
        <pre id="isi">Klik atau ketik di halaman…</pre></div>`;
    const $ = (id) => root.getElementById(id);
    let teks = '';
    window.__rekamRender = async () => {
      const steps = (await window.__rekamAmbil()) || [];
      teks = steps.map(baris).join('\n');
      $('n').textContent = steps.length;
      $('isi').textContent = teks || 'Klik atau ketik di halaman…';
      $('isi').scrollTop = $('isi').scrollHeight;
    };
    $('salin').onclick = async () => {
      try { await navigator.clipboard.writeText(teks); } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = teks; root.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      $('msg').textContent = 'Disalin ✓';
      setTimeout(() => ($('msg').textContent = ''), 1500);
    };
    $('hapus').onclick = async () => { await window.__rekamHapus(); window.__rekamRender(); };
    $('min').onclick = () => root.querySelector('.box').classList.toggle('min');
    document.documentElement.appendChild(host);
    window.__rekamRender();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', pasang);
  else pasang();
}

// ---------- Bagian Node ----------
function barisTeks(s) {
  let t = `${s.no}. ${s.aksi} ${s.jenis} "${s.nama}"`;
  if (s.nilai !== undefined) t += ` → "${s.nilai}"`;
  const extra = [`tag=${s.tag}`, s.type && `type=${s.type}`, s.id && `id=${s.id}`, s.name && `name=${s.name}`].filter(Boolean).join(', ');
  return `${t}\n   selector: ${s.selector}\n   ${extra}\n   halaman: ${s.url}`;
}

async function mulai(url, { headless = false, outDir = process.cwd() } = {}) {
  const steps = [];
  const fileTxt = path.join(outDir, 'hasil-rekaman.txt');
  const fileJson = path.join(outDir, 'hasil-rekaman.json');
  const simpan = () => {
    fs.writeFileSync(fileTxt, steps.map(barisTeks).join('\n\n') + '\n');
    fs.writeFileSync(fileJson, JSON.stringify(steps, null, 2));
  };

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({ viewport: null, permissions: ['clipboard-write'] }).catch(() => browser.newContext({ viewport: null }));
  const segarkan = () => context.pages().forEach((p) => p.evaluate(() => window.__rekamRender && window.__rekamRender()).catch(() => {}));

  await context.exposeBinding('__rekamKirim', ({ page }, step) => {
    step.no = steps.length + 1;
    step.url = page.url();
    steps.push(step);
    simpan();
    console.log(barisTeks(step) + '\n');
    segarkan();
  });
  await context.exposeBinding('__rekamAmbil', () => steps);
  await context.exposeBinding('__rekamHapus', () => { steps.length = 0; simpan(); });
  await context.addInitScript(inject);

  const page = await context.newPage();
  await page.goto(url);
  return { browser, context, page, steps, fileTxt, fileJson };
}

if (require.main === module) {
  let url = process.argv[2];
  if (!url) {
    console.log('Pemakaian: node rekam.js <alamat halaman>\nContoh:    node rekam.js https://example.com');
    process.exit(1);
  }
  if (!/^[a-z]+:\/\//i.test(url)) url = fs.existsSync(url) ? 'file://' + path.resolve(url) : 'https://' + url;
  mulai(url).then(({ browser, fileTxt }) => {
    console.log('Browser terbuka. Klik dan ketik seperti biasa.');
    console.log('Hasil tersimpan di: ' + fileTxt + '\nTutup browser untuk selesai.\n');
    browser.on('disconnected', () => process.exit(0));
    browser.contexts()[0].on('close', () => process.exit(0));
    browser.contexts()[0].pages()[0].on('close', () => browser.close().catch(() => {}));
  }).catch((e) => { console.error('Gagal membuka browser: ' + e.message); process.exit(1); });
}

module.exports = { mulai };
