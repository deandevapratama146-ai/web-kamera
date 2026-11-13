(function () {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ICON = { click: '🖱️', fill: '✏️', select: '▾', check: '☑️', press: '⌨️' };
  const NAME = { click: 'Klik', fill: 'Isi', select: 'Pilih', check: 'Centang', press: 'Tekan' };

  let playingId = null;

  const rec = new AutomationRecorder({
    onChange: render,
    onStep: (i, step, state, msg) => {
      const box = $('play-status');
      box.hidden = false;
      if (state === 'error') {
        box.className = 'play-status error';
        box.textContent = '⚠ Berhenti: ' + msg;
        return;
      }
      const auto = rec.list.find((a) => a.id === playingId);
      box.className = 'play-status';
      box.innerHTML = `▶ Menjalankan langkah ${i + 1}/${auto ? auto.steps.length : '?'}: <b>${NAME[step.action]}</b> ${esc(step.label)}`;
    },
  });

  // ---- Tab ----
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === t));
      document.querySelectorAll('.tab-body').forEach((b) => (b.hidden = b.id !== 'tab-' + t.dataset.tab));
    })
  );

  // ---- Rekam / berhenti ----
  $('rec').addEventListener('click', () => {
    if (!rec.recording) {
      rec.startRecording();
      return;
    }
    const n = rec.steps.length;
    if (!n) {
      rec.stopRecording();
      return;
    }
    const name = prompt('Nama otomasi ini:', 'Otomasi ' + (rec.list.length + 1));
    if (name === null) return; // batal: tetap merekam
    rec.stopRecording(name.trim());
  });

  function render() {
    const btn = $('rec');
    btn.textContent = rec.recording ? '⏹ Berhenti & Simpan' : '⏺ Rekam';
    btn.classList.toggle('danger-fill', rec.recording);
    btn.disabled = rec.playing;

    $('rec-live').hidden = !rec.recording;
    $('rec-count').textContent = rec.steps.length;
    $('rec-steps').innerHTML = rec.steps.map(stepHtml).join('');
    const live = $('rec-steps');
    live.scrollTop = live.scrollHeight;

    if (!rec.playing && playingId) {
      const box = $('play-status');
      if (!box.classList.contains('error')) {
        box.className = 'play-status done';
        box.textContent = '✓ Otomasi selesai dijalankan';
      }
      playingId = null;
    }

    $('autos').innerHTML = rec.list.length
      ? rec.list
          .map(
            (a) => `<li data-id="${a.id}">
          <div class="auto-head">
            <div><div class="auto-name">${esc(a.name)}</div>
            <div class="meta">${a.steps.length} langkah · ${new Date(a.created).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
            <div class="auto-actions">
              ${rec.playing && playingId === a.id
                ? '<button class="btn sm" data-act="stop">⏹ Stop</button>'
                : `<button class="btn sm primary" data-act="play" ${rec.playing || rec.recording ? 'disabled' : ''}>▶ Jalankan</button>`}
              <button class="btn sm" data-act="more" title="Lainnya">⋯</button>
            </div>
          </div>
          <div class="auto-more" hidden>
            <ol class="steps">${a.steps.map(stepHtml).join('')}</ol>
            <div class="actions">
              <button class="btn sm" data-act="rename">Ganti nama</button>
              <button class="btn sm" data-act="playwright">⬇ Skrip Playwright</button>
              <button class="btn sm" data-act="json">⬇ JSON</button>
              <button class="btn sm danger" data-act="delete">Hapus</button>
            </div>
          </div>
        </li>`
          )
          .join('')
      : '<li class="empty">Belum ada otomasi. Tekan ⏺ Rekam untuk membuat.</li>';
  }

  function stepHtml(s) {
    return `<li><span class="ico">${ICON[s.action]}</span><span><b>${NAME[s.action]}</b> ${esc(s.label)}</span></li>`;
  }

  function download(name, text, type) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  // ---- Aksi per otomasi ----
  $('autos').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const li = btn.closest('li[data-id]');
    const auto = rec.list.find((a) => a.id === li.dataset.id);
    switch (btn.dataset.act) {
      case 'play':
        playingId = auto.id;
        $('play-status').classList.remove('error');
        rec.play(auto, { delay: Number($('speed').value) });
        break;
      case 'stop':
        rec.stopPlaying();
        break;
      case 'more':
        li.querySelector('.auto-more').hidden = !li.querySelector('.auto-more').hidden;
        break;
      case 'rename': {
        const n = prompt('Nama baru:', auto.name);
        if (n) rec.rename(auto.id, n.trim());
        break;
      }
      case 'playwright':
        download(AutomationRecorder.slug(auto.name) + '.js', rec.toPlaywright(auto), 'text/javascript');
        break;
      case 'json':
        download(AutomationRecorder.slug(auto.name) + '.json', JSON.stringify(auto, null, 2), 'application/json');
        break;
      case 'delete':
        if (confirm('Hapus otomasi "' + auto.name + '"?')) rec.remove(auto.id);
        break;
    }
  });

  render();
})();
