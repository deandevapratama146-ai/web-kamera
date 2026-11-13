/*
 * tracker.js — mencatat interaksi pengguna di halaman:
 *   - menu yang dibuka/dipilih
 *   - tombol yang diklik
 *   - tombol keyboard yang ditekan
 *   - gerakan mouse (jarak tempuh) & scroll
 *
 * Pemakaian di halaman lain:
 *   <script src="tracker.js"></script>
 *   const t = new ActivityTracker({ onEvent: (e) => console.log(e) });
 *   t.start();
 *
 * Tandai elemen dengan data-track="Nama" agar namanya jelas di log.
 * Elemen menu ditandai dengan data-menu (atau berada di dalam <nav>).
 */
(function (global) {
  const STORAGE_KEY = 'activity-log-v1';
  const MAX_EVENTS = 2000;

  function labelOf(el) {
    if (!el) return '(tidak diketahui)';
    const explicit = el.getAttribute('data-track') || el.getAttribute('aria-label') || el.title;
    if (explicit) return explicit.trim();
    if (el.tagName === 'LABEL') {
      const own = Array.from(el.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').trim();
      if (own) return own.replace(/\s+/g, ' ').slice(0, 60);
    }
    const text = (el.innerText || el.value || '').trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, 60);
    return el.id ? '#' + el.id : el.tagName.toLowerCase();
  }

  function classify(el) {
    if (el.closest('[data-menu], nav, [role="menu"], [role="menubar"]')) return 'menu';
    if (el.matches('button, [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], input[type="radio"]')) return 'tombol';
    if (el.matches('a[href]')) return 'tautan';
    if (el.matches('select')) return 'pilihan';
    return 'tombol';
  }

  function describeKey(e) {
    const parts = [];
    if (e.ctrlKey && e.key !== 'Control') parts.push('Ctrl');
    if (e.altKey && e.key !== 'Alt') parts.push('Alt');
    if (e.shiftKey && e.key !== 'Shift' && e.key.length > 1) parts.push('Shift');
    if (e.metaKey && e.key !== 'Meta') parts.push('Meta');
    let k = e.key === ' ' ? 'Spasi' : e.key;
    if (k.length === 1) k = k.toUpperCase();
    parts.push(k);
    return parts.join(' + ');
  }

  class ActivityTracker {
    constructor(opts = {}) {
      this.onEvent = opts.onEvent || function () {};
      this.onMotion = opts.onMotion || function () {};
      this.persist = opts.persist !== false;
      this.running = false;
      this.events = this.persist ? this._load() : [];
      this.motion = { distance: 0, scroll: 0 };
      this._last = null;
      this._handlers = {
        click: (e) => this._onClick(e),
        change: (e) => this._onChange(e),
        keydown: (e) => this._onKey(e),
        mousemove: (e) => this._onMove(e),
        scroll: () => this._onScroll(),
      };
      this._lastScrollY = global.scrollY || 0;
    }

    start() {
      if (this.running) return;
      this.running = true;
      document.addEventListener('click', this._handlers.click, true);
      document.addEventListener('change', this._handlers.change, true);
      document.addEventListener('keydown', this._handlers.keydown, true);
      document.addEventListener('mousemove', this._handlers.mousemove, { passive: true });
      global.addEventListener('scroll', this._handlers.scroll, { passive: true });
    }

    stop() {
      this.running = false;
      document.removeEventListener('click', this._handlers.click, true);
      document.removeEventListener('change', this._handlers.change, true);
      document.removeEventListener('keydown', this._handlers.keydown, true);
      document.removeEventListener('mousemove', this._handlers.mousemove);
      global.removeEventListener('scroll', this._handlers.scroll);
      this._last = null;
    }

    clear() {
      this.events = [];
      this.motion = { distance: 0, scroll: 0 };
      this._save();
    }

    record(type, label, detail) {
      const ev = { time: new Date().toISOString(), type, label, detail: detail || '' };
      this.events.push(ev);
      if (this.events.length > MAX_EVENTS) this.events.shift();
      this._save();
      this.onEvent(ev);
      return ev;
    }

    toCSV() {
      const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
      const rows = [['waktu', 'jenis', 'nama', 'detail']];
      this.events.forEach((e) => rows.push([e.time, e.type, e.label, e.detail]));
      return rows.map((r) => r.map(esc).join(',')).join('\n');
    }

    // ---- internal ----
    _ignored(el) {
      return el.closest('[data-track-ignore]');
    }

    _onClick(e) {
      const el = e.target.closest('button, a, [role="button"], [role="menuitem"], [data-track], [data-menu] li, input[type="button"], input[type="submit"]');
      if (!el || this._ignored(el)) return;
      const section = el.closest('[data-section]');
      this.record(classify(el), labelOf(el), section ? 'Halaman: ' + section.getAttribute('data-section') : '');
    }

    _onChange(e) {
      const el = e.target;
      if (this._ignored(el)) return;
      if (el.matches('select')) {
        this.record('pilihan', labelOf(el.labels && el.labels[0] ? el.labels[0] : el), 'Dipilih: ' + el.options[el.selectedIndex].text);
      } else if (el.matches('input[type="checkbox"], input[type="radio"]')) {
        const lbl = el.labels && el.labels[0] ? labelOf(el.labels[0]) : labelOf(el);
        this.record('tombol', lbl, el.checked ? 'Dicentang' : 'Tidak dicentang');
      }
    }

    _onKey(e) {
      if (this._ignored(e.target)) return;
      if (e.repeat) return;
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return; // tombol modifier dicatat bersama kombinasinya
      // Jangan pernah catat isi kolom kata sandi.
      if (e.target.matches && e.target.matches('input[type="password"]')) {
        this.record('keyboard', '•', 'Kolom kata sandi (disamarkan)');
        return;
      }
      const where = e.target.matches && e.target.matches('input, textarea, [contenteditable]') ? 'Saat mengetik di: ' + labelOf(e.target.labels && e.target.labels[0] ? e.target.labels[0] : e.target) : '';
      this.record('keyboard', describeKey(e), where);
    }

    _onMove(e) {
      if (this._last) {
        const dx = e.clientX - this._last.x;
        const dy = e.clientY - this._last.y;
        this.motion.distance += Math.sqrt(dx * dx + dy * dy);
      }
      this._last = { x: e.clientX, y: e.clientY };
      this.onMotion({ x: e.clientX, y: e.clientY, ...this.motion });
    }

    _onScroll() {
      const y = global.scrollY || 0;
      this.motion.scroll += Math.abs(y - this._lastScrollY);
      this._lastScrollY = y;
      this.onMotion({ ...this.motion });
    }

    _load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (_) {
        return [];
      }
    }

    _save() {
      if (!this.persist) return;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
      } catch (_) {}
    }
  }

  global.ActivityTracker = ActivityTracker;
})(window);
