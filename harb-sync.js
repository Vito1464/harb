// ─────────────────────────────────────────────────────────────
//  HARB Intelligence Registry — Hybrid Permanent Cloud Engine
//  Cloud Blob Storage + P2P Realtime Triggers
// ─────────────────────────────────────────────────────────────

(function () {
  const BLOB_URL = 'https://jsonblob.com/api/jsonBlob/019d7a35-09bc-7ec7-8332-b60f4e97d3eb';
  
  const gun = GUN([
    'https://gun-manhattan.herokuapp.com/gun',
    'https://relay.peer.ooo/gun',
    'https://peer.wallie.io/gun'
  ]);
  const PAGE = (document.body.className.match(/page-(\S+)/) || [])[1] || 'index';
  const SCRIPTS = { actors: 'actors.js', campaign: 'campaign.js', war: 'dossier.js' };
  const DB = gun.get('harb_registry_vfinal_trigger_' + PAGE);

  let initialBoot = true;
  let saveTimeout = null;

  function updateStatus(status) {
    const el = document.getElementById('syncIndicator');
    if (!el) return;
    el.className = 'sync-indicator ' + status;
    if (status === 'online') el.innerHTML = '📡 CLOUD: LIVE (PERMANENT)';
    else if (status === 'syncing') el.innerHTML = '⌛ CLOUD: SYNCING...';
    else if (status === 'error') el.innerHTML = '⚠️ CLOUD: ERROR';
  }

  // Fetch the latest state from the persistent cloud
  async function fetchCloudState(isTrigger = false) {
    try {
      updateStatus('syncing');
      // Append random query string to forcefully bypass browser caches
      const res = await fetch(BLOB_URL + '?t=' + Date.now(), { headers: { 'Accept': 'application/json' }});
      if (!res.ok) throw new Error('Cloud fetch failed');
      const cloudData = await res.json();
      
      let changed = false;
      window._isSyncing = true;
      
      Object.keys(cloudData).forEach(key => {
        const localVal = localStorage.getItem(key);
        const cloudVal = cloudData[key];
        if (cloudVal && cloudVal !== localVal) {
          localStorage.setItem(key, cloudVal);
          changed = true;
        }
      });
      
      window._isSyncing = false;

      updateStatus('online');

      if (changed) {
        if (initialBoot) {
            console.log('HYBRID-SYNC: Ingested fresh cloud data on boot. Applying...');
            setTimeout(() => location.reload(), 200);
        } else {
            console.log('HYBRID-SYNC: Colleague updated the cloud! Showing prompt...');
            showBanner();
        }
      }
      
      initialBoot = false;

    } catch (err) {
      console.error('HYBRID-SYNC Error:', err);
      updateStatus('error');
    }
  }

  // Push our local state to the persistent cloud
  async function pushCloudState() {
    try {
      updateStatus('syncing');
      const payload = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('intel_') || key.startsWith('activeOp') || key === 'activeOperations') {
          payload[key] = localStorage.getItem(key);
        }
      }

      const res = await fetch(BLOB_URL, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Cloud push failed');

      updateStatus('online');
      
      // Fire P2P trigger to tell colleagues to pull the new data
      DB.get('blob_trigger').put({ time: Date.now() });

    } catch (err) {
      console.error('HYBRID-SYNC Push Error:', err);
      updateStatus('error');
    }
  }

  // Intercept LocalStorage writes to auto-save to cloud
  const _origSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (key, value) {
    _origSet.call(this, key, value);
    if (this === window.localStorage && !window._isSyncing) {
      updateStatus('syncing');
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => pushCloudState(), 1500);
    }
  };

  // Listen for realtime P2P triggers from colleagues
  DB.get('blob_trigger').on((data) => {
    if (data && data.time) {
      // Very crude check to avoid fetching our own pushes immediately
      if (Date.now() - data.time > 3000) {
        fetchCloudState(true);
      }
    }
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

  // Boot sequence
  setTimeout(() => {
    fetchCloudState();
    const src = SCRIPTS[PAGE];
    if (src && !document.querySelector(`script[src="${src}"]`)) {
      const s = document.createElement('script');
      s.src = src;
      document.body.appendChild(s);
    }
  }, 100);

})();
