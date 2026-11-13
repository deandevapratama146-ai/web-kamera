/*
 * akun.js — halaman bantu pendaftaran akun karyawan secara manual.
 * Hanya menyiapkan data dan tombol salin; tidak mengisi atau mengirim form di situs lain.
 */
(function () {
  const KEY = 'akun-karyawan-v1';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let people = load();

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (_) { return []; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(people)); } catch (_) {}
  }

  function clean(s) {
    return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function splitName(full) {
    const parts = full.trim().split(/\s+/);
    const first = parts[0];
    const last = parts.length > 1 ? parts.slice(1).join(' ') : '';
    return { first, last };
  }

  function makeUsername(first, last, format, suffix) {
    const f = clean(first);
    const l = clean(last.split(/\s+/).pop() || '');
    let base;
    if (!l) base = f;
    else if (format === 'firstlast') base = f + l;
    else if (format === 'f.last') base = f[0] + '.' + l;
    else base = f + '.' + l;
    base += clean(suffix || '');
    // Hindari username kembar di dalam daftar.
    let name = base;
    let n = 2;
    while (people.some((p) => p.username === name)) name = base + n++;
    return name;
  }

  function makePassword(len = 14) {
    const sets = ['abcdefghijkmnpqrstuvwxyz', 'ABCDEFGHJKLMNPQRSTUVWXYZ', '23456789', '!@#$%*?'];
    const all = sets.join('');
    const rnd = (max) => {
      const a = new Uint32Array(1);
      const limit = Math.floor(0xffffffff / max) * max;
      do { crypto.getRandomValues(a); } while (a[0] >= limit);
      return a[0] % max;
    };
    const chars = sets.map((s) => s[rnd(s.length)]);
    while (chars.length < len) chars.push(all[rnd(all.length)]);
    for (let i = chars.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join('');
  }

  function addNames(lines) {
    const format = $('format').value;
    const suffix = $('suffix').value;
    let added = 0;
    lines.forEach((line) => {
      // Untuk CSV: ambil kolom pertama sebagai nama.
      const full = line.split(/[,;\t]/)[0].replace(/^"|"$/g, '').trim();
      if (!full || /^(nama|name)$/i.test(full)) return;
      const { first, last } = splitName(full);
      people.push({
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        first, last,
        username: makeUsername(first, last, format, suffix),
        password: makePassword(),
        done: false,
      });
      added++;
    });
    save();
    render();
    toast(added ? added + ' karyawan ditambahkan' : 'Tidak ada nama yang bisa ditambahkan');
  }

  function render() {
    const done = people.filter((p) => p.done).length;
    $('progress').textContent = people.length ? `· ${done}/${people.length} selesai` : '';
    $('list').innerHTML = people.length
      ? people.map((p, i) => `
        <div class="person ${p.done ? 'done' : ''}" data-id="${p.id}">
          <div class="p-head">
            <label class="check"><input type="checkbox" data-act="done" ${p.done ? 'checked' : ''}> <b>${i + 1}. ${esc(p.first)} ${esc(p.last)}</b></label>
            <button class="btn sm danger" data-act="del" title="Hapus">✕</button>
          </div>
          <div class="p-grid">
            ${cell('Nama depan', p.first)}
            ${cell('Nama belakang', p.last)}
            ${cell('Username', p.username, '@gmail.com')}
            ${cell('Kata sandi', p.password, '', true)}
          </div>
        </div>`).join('')
      : '<p class="meta">Belum ada karyawan. Isi daftar nama di atas.</p>';
  }

  function cell(label, value, after, mono) {
    return `<div class="cell">
      <span class="c-label">${label}</span>
      <span class="c-val ${mono ? 'mono' : ''}">${esc(value) || '–'}<span class="meta">${after || ''}</span></span>
      <button class="btn sm" data-copy="${esc(value)}" ${value ? '' : 'disabled'}>Salin</button>
    </div>`;
  }

  let toastTimer;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.hidden = true), 1800);
  }

  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Disalin: ' + text);
  }

  // ---- Event ----
  $('add').addEventListener('click', () => {
    addNames($('names').value.split('\n'));
    $('names').value = '';
  });

  $('csv').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => addNames(String(r.result).split(/\r?\n/));
    r.readAsText(file);
    e.target.value = '';
  });

  $('list').addEventListener('click', (e) => {
    const copyBtn = e.target.closest('[data-copy]');
    if (copyBtn) return copy(copyBtn.dataset.copy);
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const id = act.closest('.person').dataset.id;
    if (act.dataset.act === 'del') {
      people = people.filter((p) => p.id !== id);
      save();
      render();
    }
  });

  $('list').addEventListener('change', (e) => {
    if (e.target.dataset.act !== 'done') return;
    const p = people.find((x) => x.id === e.target.closest('.person').dataset.id);
    p.done = e.target.checked;
    save();
    render();
  });

  $('export').addEventListener('click', () => {
    if (!people.length) return toast('Daftar masih kosong');
    const q = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    const rows = [['nama_depan', 'nama_belakang', 'email', 'kata_sandi_awal', 'status']];
    people.forEach((p) => rows.push([p.first, p.last, p.username + '@gmail.com', p.password, p.done ? 'sudah dibuat' : 'belum']));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.map(q).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'akun-karyawan.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  $('clear').addEventListener('click', () => {
    if (people.length && confirm('Hapus semua data karyawan dan kata sandinya dari browser ini?')) {
      people = [];
      save();
      render();
    }
  });

  render();
})();
