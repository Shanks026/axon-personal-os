(function () {
  if (customElements.get('l-i')) return;
  let ready;
  if (window.lucide) ready = Promise.resolve();
  else {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/lucide@0.460.0/dist/umd/lucide.min.js';
    ready = new Promise(r => { s.onload = r; });
    document.head.appendChild(s);
  }
  const pascal = n => n.replace(/(^|-)([a-z0-9])/g, (m, a, b) => b.toUpperCase());
  const cache = new Map();
  class LI extends HTMLElement {
    static get observedAttributes() { return ['n', 's', 'w']; }
    connectedCallback() {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = '<style>:host{display:inline-flex;flex-shrink:0;line-height:0}svg{display:block}</style><span></span>';
      }
      this._size();
      if (window.lucide) this.r(); else ready.then(() => this.r());
    }
    attributeChangedCallback() { if (this.shadowRoot) { this._size(); if (window.lucide) this.r(); } }
    _size() {
      const sz = (this.getAttribute('s') || 16) + 'px';
      const st = this.shadowRoot.firstChild;
      st.textContent = ':host{display:inline-flex;flex-shrink:0;line-height:0;width:' + sz + ';height:' + sz + '}svg{display:block}';
    }
    r() {
      const n = this.getAttribute('n') || '', sz = this.getAttribute('s') || 16, w = this.getAttribute('w') || 1.75;
      const key = n + '|' + sz + '|' + w;
      if (this._k === key) return;
      this._k = key;
      let html = cache.get(key);
      if (html === undefined) {
        const node = window.lucide.icons[pascal(n)];
        if (!node) html = '';
        else {
          const el = window.lucide.createElement(node);
          el.setAttribute('width', sz); el.setAttribute('height', sz);
          el.setAttribute('stroke-width', w);
          html = el.outerHTML;
        }
        cache.set(key, html);
      }
      this.shadowRoot.lastChild.innerHTML = html;
    }
  }
  customElements.define('l-i', LI);
})();
