// ─────────────────────────────────────────────────────────────
//  HARB Intelligence Registry — Peer-to-Peer Sync Engine (GUN)
//  NO API KEYS. NO RULES. JUST SYNC.
// ─────────────────────────────────────────────────────────────

(function () {
  const gun = GUN([
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://peer.wallie.io/gun'
  ]);
  const PAGE = (document.body.className.match(/page-(\S+)/) || [])[1] || 'index';
  const SCRIPTS = { actors: 'actors.js', campaign: 'campaign.js', war: 'dossier.js' };
  const DB = gun.get('harb_registry_vfinal_ext_' + PAGE);

  function updateStatus(status) {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    el.className = 'sync-indicator ' + status;
    el.innerHTML = status === 'online' ? '📡 CLOUD: LIVE (P2P)' : '⌛ SYNCING...';
  }

  // Chunking mechanics for Base64 imagery arrays that break GunJS WS limits
  const CHUNK_LIMIT = 50000; // 50KB chunks

  function putChunked(key, value) {
    if (!value) return;
    const totalChunks = Math.ceil(value.length / CHUNK_LIMIT);
    // Write out the raw chunks asynchronously
    for (let i = 0; i < totalChunks; i++) {
      DB.get(key + '_chunk_' + i).put({ val: value.substring(i * CHUNK_LIMIT, (i + 1) * CHUNK_LIMIT) });
    }
    // Finalise by writing the meta head to trigger read algorithms
    DB.get(key + '_meta').put({ chunks: totalChunks, lastUpdate: Date.now() }, ack => {
      if (!ack.err) updateStatus('online');
    });
  }

  // Intercept LocalStorage writes
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (this === window.localStorage && !window._isSyncing) {
      updateStatus('syncing');
      putChunked(key, value);
    }
  };

  // Reconstruct incoming chunked updates natively
  let bootCount = 0;
  DB.map().on((data, key) => {
    // Only subscribe to the meta entry to orchestrate reconstruction
    if (key.endsWith('_meta') && data && data.chunks) {
      const baseKey = key.replace('_meta', '');
      let reconstructed = [];
      let gathered = 0;
      const expected = data.chunks;
      
      for (let i = 0; i < expected; i++) {
        DB.get(baseKey + '_chunk_' + i).once(chunkData => {
           if (chunkData && chunkData.val) {
             reconstructed[i] = chunkData.val;
             gathered++;
             if (gathered === expected) {
                const fullPayload = reconstructed.join('');
                const localVal = localStorage.getItem(baseKey);
                if (localVal !== fullPayload) {
                    const wasEmpty = !localVal;
                    window._isSyncing = true;
                    localStorage.setItem(baseKey, fullPayload);
                    window._isSyncing = false;
                    
                    if (bootCount > 5 && !wasEmpty) {
                        showBanner();
                    } else {
                        console.log('GunJS: Injected heavy payload [' + baseKey + ']. Reloading phase shift...');
                        setTimeout(() => location.reload(), 600);
                    }
                }
             }
           }
        });
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
