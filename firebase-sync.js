// ─────────────────────────────────────────────────────────────
//  HARB Intelligence Registry — Real-time Shared Database Sync
//  Replaces per-browser localStorage with a shared Firebase DB.
//  Drop this BEFORE actors.js / campaign.js / dossier.js.
// ─────────────────────────────────────────────────────────────

(function () {

  // Determine which page we're on from <body class="page-xxx">
  const PAGE = (document.body.className.match(/page-(\S+)/) || [])[1] || 'index';

  // Map page names to their main script files
  const SCRIPTS = {
    actors:   'actors.js',
    campaign: 'campaign.js',
    dossier:  'dossier.js',
  };

  // ── Load the page's main JS ──────────────────────────────────────────────
  // Called after Firebase has hydrated localStorage (or after timeout fallback)
  function loadPageScript() {
    const src = SCRIPTS[PAGE];
    if (!src) return;
    const s = document.createElement('script');
    s.src = src;
    document.body.appendChild(s);
  }

  // ── No config? Run offline ───────────────────────────────────────────────
  const cfg = window.HARB_FIREBASE_CONFIG;
  if (!cfg || cfg.apiKey.startsWith('PASTE_')) {
    console.warn('[HARB] Firebase config not set — running in local-only mode.');
    loadPageScript();
    return;
  }

  // ── Init Firebase ────────────────────────────────────────────────────────
  firebase.initializeApp(cfg);
  const db       = firebase.database();
  const PAGE_REF = db.ref('harb/' + PAGE);

  // ── Key encoding (Firebase forbids dots, $, #, [, ], /) ──────────────────
  function encodeKey(k) {
    return '_' + btoa(unescape(encodeURIComponent(k))).replace(/=/g, '-');
  }
  function decodeKey(ek) {
    return decodeURIComponent(escape(atob(ek.slice(1).replace(/-/g, '='))));
  }

  // ── Write interceptor ────────────────────────────────────────────────────
  // Every localStorage.setItem call is mirrored to Firebase automatically.
  // This means zero changes needed in actors.js / campaign.js / dossier.js.
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (this === window.localStorage) {
      try {
        const patch = {};
        patch[encodeKey(key)] = value;
        PAGE_REF.update(patch);
      } catch (e) {
        console.error('[HARB] Firebase write error:', e);
      }
    }
  };

  // ── Initial load: Firebase → localStorage → boot page ────────────────────
  let booted = false;
  function boot() {
    if (booted) return;
    booted = true;
    loadPageScript();
  }

  // Safety timeout: if Firebase takes >4s, boot with whatever we have locally
  const timeout = setTimeout(boot, 4000);

  PAGE_REF.once('value', function (snapshot) {
    clearTimeout(timeout);
    const data = snapshot.val();
    if (data) {
      // Hydrate localStorage from Firebase before the page JS touches it
      Object.entries(data).forEach(function (entry) {
        try {
          _origSet.call(localStorage, decodeKey(entry[0]), entry[1]);
        } catch (e) { /* ignore individual key errors */ }
      });
    }
    boot();
  });

  // ── Real-time listener: update localStorage when another user saves ───────
  let initialized = false;
  PAGE_REF.on('value', function (snapshot) {
    // Skip the first fire (that's the initial load handled above)
    if (!initialized) { initialized = true; return; }

    const data = snapshot.val();
    if (!data) return;

    let changed = false;
    Object.entries(data).forEach(function (entry) {
      try {
        const key = decodeKey(entry[0]);
        const val = entry[1];
        if (localStorage.getItem(key) !== val) {
          _origSet.call(localStorage, key, val); // bypass our interceptor
          changed = true;
        }
      } catch (e) { /* ignore */ }
    });

    if (changed) showUpdateBanner();
  });

  // ── Update notification banner ────────────────────────────────────────────
  function showUpdateBanner() {
    if (document.getElementById('harb-sync-banner')) return; // already visible

    const b = document.createElement('div');
    b.id = 'harb-sync-banner';
    b.innerHTML = '⟳ &nbsp;Database updated by another operator &mdash; <u>click to refresh</u>';

    Object.assign(b.style, {
      position:    'fixed',
      top:         '58px',
      left:        '50%',
      transform:   'translateX(-50%)',
      background:  '#0d1f0d',
      border:      '1px solid #2a5a2a',
      color:       '#5aff5a',
      fontFamily:  "'IBM Plex Mono', monospace",
      fontSize:    '11px',
      letterSpacing: '0.06em',
      padding:     '8px 20px',
      borderRadius:'3px',
      zIndex:      '99999',
      cursor:      'pointer',
      boxShadow:   '0 2px 16px rgba(0, 100, 0, 0.25)',
      whiteSpace:  'nowrap',
    });

    b.onclick = function () { window.location.reload(); };
    document.body.appendChild(b);

    // Auto-dismiss after 30 seconds
    setTimeout(function () {
      if (b.parentNode) b.parentNode.removeChild(b);
    }, 30000);
  }

})();
