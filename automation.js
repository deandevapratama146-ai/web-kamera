/*
 * automation.js — rekam langkah di halaman lalu jalankan ulang otomatis.
 *
 * Langkah yang direkam:
 *   click  : klik menu / tombol / tautan
 *   fill   : isi kolom teks (nilai akhir, bukan per huruf)
 *   select : pilih opsi di dropdown
 *   check  : centang / hapus centang
 *   press  : tombol keyboard di luar kolom teks (mis. Enter, Escape, Ctrl + S)
 *
 * Kolom kata sandi tidak pernah direkam.
 * Bagian dengan atribut data-track-ignore tidak direkam.
 */
(function (global) {
  const STORAGE_KEY = 'automations-v1';
  const MODIFIERS = ['Control', 'Shift', 'Alt', 'Meta'];

  // ---- Selector CSS yang stabil untuk sebuah elemen ----
  function cssEscape(s) {
    return global.CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/["\\]/g, '\\$&');
  }

  function selectorFor(el) {
    if (el.id) return '#' + cssEscape(el.id);
    const track = el.getAttribute('data-track');
    if (track) {
      const sel = '[data-track="' + track.replace(/"/g, '\\"') + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    const name = el.getAttribute('name');
    if (name) {
      const sel = el.tagName.toLowerCase() + '[name="' + name.replace(/"/g, '\\"') + '"]';
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node !== document.body) {
      if (node.id) {
        parts.unshift('#' + cssEscape(node.id));
        break;
      }
      const tag = node.tagName.toLowerCase();
      const sameTag = Array.from(node.parentElement.children).filter((c) => c.tagName === node.tagName);
      parts.unshift(sameTag.length > 1 ? tag + ':nth-of-type(' + (sameTag.indexOf(node) + 1) + ')' : tag);
      node = node.parentElement;
    }
    return parts.join(' > ');
  }

  function labelOf(el) {
    const explicit = el.getAttribute('data-track') || el.getAttribute('aria-label');
    if (explicit) return explicit;
    const lbl = el.labels && el.labels[0];
    if (lbl) {
      const own = Array.from(lbl.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
      if (own) return own.replace(/\s+/g, ' ');
    }
    const text = (el.innerText || el.placeholder || '').trim().replace(/\s+/g, ' ');
    return text ? text.slice(0, 50) : el.tagName.toLowerCase();
  }

  function keyCombo(e) {
    const p = [];
    if (e.ctrlKey) p.push('Control');
    if (e.altKey) p.push('Alt');
    if (e.shiftKey) p.push('Shift');
    if (e.metaKey) p.push('Meta');
    p.push(e.key === ' ' ? 'Space' : e.key);
    return p.join('+');
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  class AutomationRecorder {
    constructor(opts = {}) {
      this.onChange = opts.onChange || function () {};
      this.onStep = opts.onStep || function () {};
      this.recording = false;
      this.playing = false;
      this.steps = [];
      this.list = this._load();
      this._h = {
        click: (e) => this._onClick(e),
        change: (e) => this._onInputChange(e),
        keydown: (e) => this._onKey(e),
      };
    }

    // ---------- Rekam ----------
    startRecording() {
      if (this.playing) return;
      this.steps = [];
      this.recording = true;
      document.addEventListener('click', this._h.click, true);
      document.addEventListener('change', this._h.change, true);
      document.addEventListener('keydown', this._h.keydown, true);
      this.onChange();
    }

    stopRecording(name) {
      this.recording = false;
      document.removeEventListener('click', this._h.click, true);
      document.removeEventListener('change', this._h.change, true);
      document.removeEventListener('keydown', this._h.keydown, true);
      let saved = null;
      if (this.steps.length) {
        saved = {
          id: Date.now().toString(36),
          name: name || 'Otomasi ' + (this.list.length + 1),
          created: new Date().toISOString(),
          url: location.pathname.split('/').pop() || 'index.html',
          steps: this.steps,
        };
        this.list.unshift(saved);
        this._save();
      }
      this.steps = [];
      this.onChange();
      return saved;
    }

    _skip(el) {
      return !el || !el.closest || el.closest('[data-track-ignore]');
    }

    _push(step) {
      this.steps.push(step);
      this.onChange();
    }

    _onClick(e) {
      const el = e.target.closest('button, a, [role="button"], [role="menuitem"], [data-track], input[type="button"], input[type="submit"]');
      if (this._skip(el)) return;
      this._push({ action: 'click', selector: selectorFor(el), label: labelOf(el) });
    }

    _onInputChange(e) {
      const el = e.target;
      if (this._skip(el)) return;
      if (el.matches('input[type="password"]')) return; // jangan pernah rekam kata sandi
      if (el.matches('select')) {
        this._push({ action: 'select', selector: selectorFor(el), value: el.value, label: labelOf(el) + ' = ' + el.options[el.selectedIndex].text });
      } else if (el.matches('input[type="checkbox"], input[type="radio"]')) {
        // Klik pada kotak centang sudah memicu "change"; rekam sebagai status akhir.
        this._push({ action: 'check', selector: selectorFor(el), value: el.checked, label: labelOf(el) + (el.checked ? ' ✓' : ' ✗') });
      } else if (el.matches('input, textarea')) {
        this._recordFill(el);
      }
    }

    // Rekam nilai kolom teks; lewati jika langkah terakhir sudah mengisi nilai yang sama.
    _recordFill(el) {
      const selector = selectorFor(el);
      const last = this.steps[this.steps.length - 1];
      const prevFill = [...this.steps].reverse().find((s) => s.selector === selector && s.action === 'fill');
      if (prevFill && prevFill.value === el.value && last && (last === prevFill || last.selector === selector)) return;
      this._push({ action: 'fill', selector, value: el.value, label: labelOf(el) + ' = "' + el.value + '"' });
    }

    _onKey(e) {
      if (e.repeat || MODIFIERS.includes(e.key)) return;
      if (this._skip(e.target)) return;
      const inField = e.target.matches && e.target.matches('input, textarea, select, [contenteditable]');
      // Di dalam kolom teks, huruf biasa sudah terekam lewat langkah "fill".
      // Yang direkam hanya Enter/Tab/Escape atau kombinasi dengan Ctrl/Alt/Meta.
      if (inField && !(e.ctrlKey || e.altKey || e.metaKey || ['Enter', 'Tab', 'Escape'].includes(e.key))) return;
      if (inField && e.target.matches('input[type="password"]')) return;
      // Pastikan isian teks terekam sebelum tombol seperti Enter.
      if (inField && e.target.matches('input:not([type="checkbox"]):not([type="radio"]), textarea')) this._recordFill(e.target);
      this._push({ action: 'press', selector: inField ? selectorFor(e.target) : null, key: keyCombo(e), label: keyCombo(e).replace(/\+/g, ' + ') });
    }

    // ---------- Jalankan ----------
    async play(auto, { delay = 600 } = {}) {
      if (this.playing || this.recording) return;
      this.playing = true;
      this.onChange();
      try {
        for (let i = 0; i < auto.steps.length; i++) {
          if (!this.playing) break;
          const step = auto.steps[i];
          this.onStep(i, step, 'run');
          await this._run(step);
          this.onStep(i, step, 'ok');
          await sleep(delay);
        }
      } catch (err) {
        this.onStep(-1, null, 'error', err.message);
      } finally {
        this.playing = false;
        this.onChange();
      }
    }

    stopPlaying() {
      this.playing = false;
    }

    async _run(step) {
      const el = step.selector ? document.querySelector(step.selector) : document.activeElement || document.body;
      if (!el) throw new Error('Elemen tidak ditemukan: ' + step.label);
      this._highlight(el);
      await sleep(250);
      switch (step.action) {
        case 'click':
          el.click();
          break;
        case 'fill':
          el.focus();
          el.value = step.value;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        case 'select':
          el.value = step.value;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        case 'check':
          if (el.checked !== step.value) el.click();
          break;
        case 'press': {
          const parts = step.key.split('+');
          const key = parts.pop();
          const init = {
            key: key === 'Space' ? ' ' : key,
            bubbles: true,
            ctrlKey: parts.includes('Control'),
            altKey: parts.includes('Alt'),
            shiftKey: parts.includes('Shift'),
            metaKey: parts.includes('Meta'),
          };
          el.dispatchEvent(new KeyboardEvent('keydown', init));
          el.dispatchEvent(new KeyboardEvent('keyup', init));
          if (key === 'Enter' && el.form) el.form.requestSubmit ? el.form.requestSubmit() : el.form.submit();
          break;
        }
      }
    }

    _highlight(el) {
      el.classList.add('auto-hl');
      setTimeout(() => el.classList.remove('auto-hl'), 700);
    }

    // ---------- Kelola daftar ----------
    remove(id) {
      this.list = this.list.filter((a) => a.id !== id);
      this._save();
      this.onChange();
    }

    rename(id, name) {
      const a = this.list.find((x) => x.id === id);
      if (a && name) {
        a.name = name;
        this._save();
        this.onChange();
      }
    }

    toPlaywright(auto) {
      const q = (s) => JSON.stringify(s);
      const lines = [
        "// Skrip Playwright hasil rekaman: " + auto.name,
        '// Jalankan:  npm i -D playwright && npx playwright install chromium && node ' + slug(auto.name) + '.js',
        "const { chromium } = require('playwright');",
        '',
        '// Ganti dengan alamat halaman Anda (file:///… atau https://…)',
        'const URL = process.env.URL || ' + q(location.href.split('#')[0]) + ';',
        '',
        '(async () => {',
        '  const browser = await chromium.launch({ headless: false, slowMo: 300 });',
        '  const page = await browser.newPage();',
        '  await page.goto(URL);',
      ];
      auto.steps.forEach((s, i) => {
        lines.push('  // ' + (i + 1) + '. ' + s.label);
        if (s.action === 'click') lines.push('  await page.locator(' + q(s.selector) + ').click({ force: true });');
        if (s.action === 'fill') lines.push('  await page.locator(' + q(s.selector) + ').fill(' + q(s.value) + ');');
        if (s.action === 'select') lines.push('  await page.locator(' + q(s.selector) + ').selectOption(' + q(s.value) + ');');
        if (s.action === 'check') lines.push('  await page.locator(' + q(s.selector) + ').setChecked(' + s.value + ');');
        if (s.action === 'press') {
          lines.push(s.selector
            ? '  await page.locator(' + q(s.selector) + ').press(' + q(s.key) + ');'
            : '  await page.keyboard.press(' + q(s.key) + ');');
        }
      });
      lines.push('  await page.waitForTimeout(1000);', '  await browser.close();', '})();', '');
      return lines.join('\n');
    }

    _load() {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      } catch (_) {
        return [];
      }
    }

    _save() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list));
      } catch (_) {}
    }
  }

  function slug(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'otomasi';
  }

  AutomationRecorder.slug = slug;
  global.AutomationRecorder = AutomationRecorder;
})(window);
