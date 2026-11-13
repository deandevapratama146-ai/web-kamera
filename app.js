(function () {
  const $ = (id) => document.getElementById(id);
  const logEl = $('log');
  const filterEl = $('filter');

  const ICON = { menu: '☰', tombol: '🔘', keyboard: '⌨️', pilihan: '▾', tautan: '🔗' };

  const tracker = new ActivityTracker({
    onEvent: () => render(),
    onMotion: (m) => {
      if (m.x !== undefined) $('pos').textContent = m.x + ', ' + m.y;
      $('s-move').textContent = Math.round(m.distance).toLocaleString('id-ID');
      $('scroll').textContent = Math.round(m.scroll).toLocaleString('id-ID');
    },
  });

  function fmtTime(iso) {
    return new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function render() {
    const events = tracker.events;
    const count = (t) => events.filter((e) => e.type === t).length;
    $('s-menu').textContent = count('menu');
    $('s-tombol').textContent = count('tombol') + count('pilihan') + count('tautan');
    $('s-key').textContent = count('keyboard');

    // Paling sering (selain keyboard)
    const freq = {};
    events.filter((e) => e.type !== 'keyboard').forEach((e) => (freq[e.label] = (freq[e.label] || 0) + 1));
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 5);
    $('top').innerHTML = top.length
      ? top.map(([l, n]) => `<li><span>${escapeHtml(l)}</span><b>${n}×</b></li>`).join('')
      : '<li class="empty">Belum ada</li>';

    // Log terbaru di atas
    const f = filterEl.value;
    const list = events.filter((e) => !f || e.type === f).slice(-200).reverse();
    logEl.innerHTML = list.length
      ? list
          .map(
            (e) => `<li class="t-${e.type}">
              <span class="ico">${ICON[e.type] || '•'}</span>
              <div><div class="lbl">${escapeHtml(e.label)}</div>
              <div class="meta">${fmtTime(e.time)} · ${e.type}${e.detail ? ' · ' + escapeHtml(e.detail) : ''}</div></div>
            </li>`
          )
          .join('')
      : '<li class="empty">Belum ada aktivitas.</li>';
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // ---- Navigasi halaman & submenu ----
  document.querySelectorAll('[data-page]').forEach((btn) =>
    btn.addEventListener('click', () => {
      document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
      $('page-' + btn.dataset.page).classList.add('active');
      document.querySelectorAll('.has-sub.open').forEach((li) => li.classList.remove('open'));
    })
  );
  document.querySelectorAll('.has-sub > .menu-btn').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const li = btn.parentElement;
      const wasOpen = li.classList.contains('open');
      document.querySelectorAll('.has-sub.open').forEach((x) => x.classList.remove('open'));
      if (!wasOpen) li.classList.add('open');
    })
  );
  document.addEventListener('click', () => document.querySelectorAll('.has-sub.open').forEach((x) => x.classList.remove('open')));

  // ---- Kontrol panel ----
  filterEl.addEventListener('change', render);
  $('toggle').addEventListener('click', () => {
    if (tracker.running) {
      tracker.stop();
      $('toggle').textContent = 'Lanjutkan';
      $('status').textContent = '❚❚ Dijeda';
      $('status').classList.add('paused');
    } else {
      tracker.start();
      $('toggle').textContent = 'Jeda';
      $('status').textContent = '● Merekam';
      $('status').classList.remove('paused');
    }
  });
  $('clear').addEventListener('click', () => {
    if (confirm('Hapus semua catatan aktivitas?')) {
      tracker.clear();
      $('s-move').textContent = '0';
      $('scroll').textContent = '0';
      render();
    }
  });
  $('export').addEventListener('click', () => {
    const blob = new Blob(['﻿' + tracker.toCSV()], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'aktivitas-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  tracker.start();
  render();
})();
