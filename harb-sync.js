// ─────────────────────────────────────────────────────────────
//  HARB Intelligence Registry — Peer-to-Peer Sync Engine (GUN)
//  NO API KEYS. NO RULES. JUST SYNC.
// ─────────────────────────────────────────────────────────────

(function () {
  const gun = GUN(['https://gun-manhattan.herokuapp.com/gun']);
  const PAGE = (document.body.className.match(/page-(\S+)/) || [])[1] || 'index';
  const SCRIPTS = { actors: 'actors.js', campaign: 'campaign.js', war: 'dossier.js' };
  const DB = gun.get('harb_registry_vfinal_ext_' + PAGE);

  function updateStatus(status) {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    el.className = 'sync-indicator ' + status;
    el.innerHTML = status === 'online' ? '📡 CLOUD: LIVE (P2P)' : '⌛ SYNCING...';
  }

  // Intercept LocalStorage writes
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (this === window.localStorage && !window._isSyncing) {
      updateStatus('syncing');
      DB.get(key).put({ val: value }, ack => {
        if (!ack.err) updateStatus('online');
      });
    }
  };

  // Initial Load & Real-time Listeners
  let bootCount = 0;
  DB.map().on((data, key) => {
    if (data && data.val) {
      if (localStorage.getItem(key) !== data.val) {
        window._isSyncing = true;
        localStorage.setItem(key, data.val);
        window._isSyncing = false;
        
        // Show update banner if not the initial boot
        if (bootCount > 5) showBanner();
      }
    }
    bootCount++;
  });

  function showBanner() {
    if (document.getElementById('sync-banner')) return;
    const b = document.createElement('div');
    b.id = 'sync-banner';
    b.innerHTML = '⟳ NEW INTEL RECEIVED — CLICK TO REFRESH';
    Object.assign(b.style, {
      position:'fixed', top:'60px', left:'50%', transform:'translateX(-50%)',
      background:'#0d1f0d', border:'1px solid #2a5a2a', color:'#5aff5a',
      padding:'8px 20px', borderRadius:'4px', zIndex:'9999', cursor:'pointer', fontFamily:'monospace', fontSize:'11px'
    });
    b.onclick = () => location.reload();
    document.body.appendChild(b);
  }

  // Fallback boot & Seeding
  setTimeout(() => {
    updateStatus('online');
    
    // BROADCAST EXISTING LOCAL INTEL TO NO-CONFIG P2P CLOUD
    if (!window._isSyncing) {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('intel_') || key.startsWith('activeOp') || key === 'activeOperations') {
          const val = localStorage.getItem(key);
          DB.get(key).put({ val: val });
        }
      });
    }

    const src = SCRIPTS[PAGE];
    if (src && !document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script');
      s.src = src;
      document.body.appendChild(s);
    }
  }, 1500);

})();
