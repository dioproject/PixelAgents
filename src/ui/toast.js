// ============================================================
// toast.js — Notifikasi melayang (pojok atas)
// ============================================================

export class ToastUI {
  constructor(root = document.getElementById('toast-root')) {
    this.root = root;
    this.items = [];
  }

  /**
   * @param {string} text
   * @param {'info'|'success'|'danger'} kind
   * @param {number} duration ms
   */
  show(text, kind = 'info', duration = 4200) {
    if (!this.root || !text) return;

    // maksimal 4 toast aktif agar tidak menutupi layar
    while (this.items.length >= 4) {
      const oldest = this.items.shift();
      oldest?.remove();
    }

    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    this.root.appendChild(el);
    this.items.push(el);

    const timer = setTimeout(() => {
      el.classList.add('fading');
      setTimeout(() => {
        el.remove();
        this.items = this.items.filter((x) => x !== el);
      }, 380);
    }, Math.max(1500, duration));

    el._timer = timer;
  }

  clear() {
    for (const el of this.items) {
      clearTimeout(el._timer);
      el.remove();
    }
    this.items = [];
  }
}
