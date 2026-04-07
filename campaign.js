// ═══════════════════════════════════════════════════════════════
// CAMPAIGN.JS — Strategic Registry: Campaign Tracker
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'intel_campaign_data';
const ACTORS_STORAGE_KEY = 'intel_actors_data';

function getActorProfiles() {
  try {
    const data = localStorage.getItem(ACTORS_STORAGE_KEY);
    if (data) return JSON.parse(data).nodes || [];
  } catch (e) {}
  return [];
}

function showToast(msg, type = '') {
  let c = document.querySelector('.toast-container');
  if (!c) { c = document.createElement('div'); c.className = 'toast-container'; document.body.appendChild(c); }
  const t = document.createElement('div');
  t.className = 'toast' + (type ? ' ' + type : '');
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

// ── DATA ──
const defaultOps = [
  {
    "id": 2,
    "name": "OP: SHADOW_TRACE",
    "dossier": "Dossier #2024-SHADOW · Active Surveillance Operation",
    "briefing": "Covert tracking operation targeting identified hostile network entities in Eastern Europe. Focus on signals interception and asset identification.",
    "incidents": [
      {
        "id": 5,
        "recordId": "SC-00001",
        "name": "SIGNAL_INTERCEPT_A",
        "source": "SIGINT Division",
        "priority": "high",
        "affiliation": "neutral",
        "desc": "Radio intercept captured on encrypted channel 7. Partial decryption indicates movement orders.",
        "timestamp": "2024.10.15 09:12:00",
        "status": "link",
        "response": ""
      }
    ]
  },
  {
    "id": 3,
    "name": "OP: IRON_GATE_2025",
    "dossier": "Dossier #2025-IRONGATE · Border Security Intelligence",
    "briefing": "Border intelligence operation monitoring cross-sector movement of identified hostile entities. Priority: prevent kinetic engagement.",
    "incidents": []
  },
  {
    "id": 13,
    "name": "MUSLIM INFRA",
    "dossier": "Dossier #NEW · Classified Intelligence",
    "briefing": "Enemies from the cult islam",
    "incidents": []
  },
  {
    "id": 14,
    "name": "START UP FACTIONS",
    "dossier": "Dossier #NEW · Classified Intelligence",
    "briefing": "Attempts to undermine the reasonableness of our different business vehicles",
    "incidents": []
  },
  {
    "id": 15,
    "name": "OXFORD UNIVERISTY",
    "dossier": "Dossier #NEW · Classified Intelligence",
    "briefing": "The fight for the seat of metaphysics in the united kingdom",
    "incidents": []
  },
  {
    "id": 16,
    "name": "HEARTH OPERATIONS",
    "dossier": "Dossier #NEW · Classified Intelligence",
    "briefing": "Securing the borders of our various properties",
    "incidents": []
  },
  {
    "id": 17,
    "name": "BEHIND THE GATES",
    "dossier": "Dossier #NEW · Classified Intelligence",
    "briefing": "Plugging the leaks",
    "incidents": []
  }
];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultOps));
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(operations)); } catch (e) {}
  fetch('/api/sync?db=campaign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(operations)
  }).catch(()=>{});
}

// Global Sync on boot
function fetchCloudData() {
  fetch('/api/sync?db=campaign')
    .then(res => res.json())
    .then(data => {
      if(Array.isArray(data) && data.length > 0) {
        const cloudStr = JSON.stringify(data);
        const localStr = localStorage.getItem(STORAGE_KEY);

        if(!localStr || cloudStr !== localStr) {
          operations = data;
          localStorage.setItem(STORAGE_KEY, cloudStr);
          nextIncId = Math.max(...operations.flatMap(o => o.incidents.map(i => i.id)), 0) + 10;
          nextOpId = Math.max(...operations.map(o => o.id), 0) + 10;
          
          const exists = operations.find(o => o.id === activeOpId);
          if(!exists) activeOpId = operations[0].id;
          
          renderOpSelect();
          loadActiveOp();
        }
      }
    }).catch(()=>{});
}

fetchCloudData();
setInterval(fetchCloudData, 30000);

let operations = loadData();
let activeOpId = operations[0]?.id || 1;
let currentPage = 1;
const PER_PAGE = 4;
let filterPriority = 'all';
let filterAffiliation = 'all';
let filterSort = 'newest';
let nextIncId = Math.max(...operations.flatMap(o => o.incidents.map(i => i.id)), 0) + 10;
let nextOpId = Math.max(...operations.map(o => o.id), 0) + 10;
let linkResponseTargetId = null;

function getActiveOp() { return operations.find(o => o.id === activeOpId) || operations[0]; }

// ── RENDER ──
function renderOpSelect() {
  const sel = document.getElementById('opSelect');
  sel.innerHTML = '';
  operations.forEach(op => {
    const opt = document.createElement('option');
    opt.value = op.id; opt.textContent = op.name;
    if (op.id === activeOpId) opt.selected = true;
    sel.appendChild(opt);
  });
}

function loadActiveOp() {
  const op = getActiveOp();
  document.getElementById('opNameHeader').textContent = op.name;
  document.getElementById('dossierSubtitle').textContent = op.dossier;
  document.getElementById('briefingArea').value = op.briefing;
  currentPage = 1;
  renderIncidents();
}

// Inline edit for operation name & dossier string
document.getElementById('opNameHeader').addEventListener('blur', e => {
  const op = getActiveOp();
  const newName = e.target.textContent.trim().toUpperCase();
  if (!newName) { e.target.textContent = op.name; return; }
  op.name = newName;
  saveData();
  renderOpSelect(); // Refresh dropdown
  showToast('Operation renamed', 'success');
});
document.getElementById('dossierSubtitle').addEventListener('blur', e => {
  const op = getActiveOp();
  op.dossier = e.target.textContent.trim();
  saveData();
});

function getFilteredIncidents() {
  const op = getActiveOp();
  let list = [...op.incidents];
  if (filterPriority !== 'all') list = list.filter(i => i.priority === filterPriority);
  if (filterAffiliation !== 'all') list = list.filter(i => i.affiliation === filterAffiliation);
  if (filterSort === 'oldest') list.reverse();
  else if (filterSort === 'priority') {
    const order = { critical: 0, high: 1, medium: 2, internal: 3, low: 4 };
    list.sort((a, b) => (order[a.priority] || 9) - (order[b.priority] || 9));
  }
  return list;
}

function renderIncidents() {
  const list = getFilteredIncidents();
  const totalPages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  if (currentPage > totalPages) currentPage = totalPages;
  const page = list.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const container = document.getElementById('incidentList');
  container.innerHTML = '';

  page.forEach(inc => {
    const card = document.createElement('div');
    card.className = `incident-card priority-${inc.priority}`;

    const priorityLabels = { critical: 'CRITICAL', high: 'PRIORITY: HIGH', medium: 'PRIORITY: MED', low: 'LOW INTEREST', internal: 'INTERNAL AUTH' };
    const affilBadge = inc.affiliation ? `<span class="priority-badge badge-${inc.affiliation}" style="margin-left:4px;">${inc.affiliation.toUpperCase()}</span>` : '';
    const isValidated = inc.status === 'validated';

    card.innerHTML = `
      <div class="inc-left">
        <div class="rec-id-label">RECORD ID</div>
        <div class="rec-id" contenteditable="true" id="rid-${inc.id}">${inc.recordId}</div>
        <span class="priority-badge badge-${inc.priority}">${priorityLabels[inc.priority] || inc.priority.toUpperCase()}</span>
        ${affilBadge}
      </div>
      <div class="inc-body">
        <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:4px;flex-wrap:wrap;">
          <div class="inc-name" contenteditable="true" id="iname-${inc.id}">${inc.name}</div>
          <span style="font-family:var(--mono);font-size:11px;color:var(--text3);">/ <span class="inc-source" contenteditable="true" id="isrc-${inc.id}">${inc.source}</span></span>
        </div>
        <div class="inc-desc" contenteditable="true" id="idesc-${inc.id}">${inc.desc.replace(/\n/g, '<br>')}</div>
        ${inc.response ? `<div style="font-family:var(--mono);font-size:10px;color:var(--green);margin-top:6px;padding:4px 8px;background:rgba(46,125,82,0.08);border-radius:3px;border-left:2px solid var(--green);">↪ ${inc.response}</div>` : ''}
      </div>
      <div class="inc-right">
        ${isValidated
          ? `<button class="inc-btn validated-btn" onclick="toggleValidated(${inc.id})">✓ VALIDATED</button>`
          : `<button class="inc-btn link-btn" onclick="openLinkResponse(${inc.id})">⇢ LINK RESPONSE</button>`
        }
        <div class="inc-timestamp">Timestamp: ${inc.timestamp}</div>
        <button class="remove-btn" onclick="deleteIncident(${inc.id})" title="Delete incident" style="align-self:flex-end;">🗑</button>
      </div>`;

    // Auto-save on blur for inline editable fields
    card.querySelector(`#rid-${inc.id}`).addEventListener('blur', el => { inc.recordId = el.target.textContent.trim(); saveData(); });
    card.querySelector(`#iname-${inc.id}`).addEventListener('blur', el => { inc.name = el.target.textContent.trim(); saveData(); });
    card.querySelector(`#isrc-${inc.id}`).addEventListener('blur', el => { inc.source = el.target.textContent.trim(); saveData(); });
    card.querySelector(`#idesc-${inc.id}`).addEventListener('blur', el => { inc.desc = el.target.innerText.trim(); saveData(); });

    container.appendChild(card);
  });

  document.getElementById('pageInfo').textContent = `DISPLAYING PAGE ${String(currentPage).padStart(2,'0')} / ARCHIVE TOTAL: ${list.length} INCIDENTS`;
  renderPagination(totalPages);
  updateStats();
}

window.openLinkResponse = function(incId) {
  linkResponseTargetId = incId;
  const op = getActiveOp();
  const inc = op.incidents.find(i => i.id === incId);
  if (!inc) return;
  document.getElementById('linkResponseIncName').textContent = inc.name;
  document.getElementById('linkRespUnit').value = '';
  document.getElementById('linkRespRef').value = '';
  document.getElementById('linkRespNotes').value = '';
  document.getElementById('linkRespValidate').value = 'no';
  openModal('linkResponseModal');
};

window.toggleValidated = function(incId) {
  const op = getActiveOp();
  const inc = op.incidents.find(i => i.id === incId);
  if (!inc) return;
  inc.status = inc.status === 'validated' ? 'link' : 'validated';
  saveData(); renderIncidents();
  showToast(inc.status === 'validated' ? 'Incident validated ✓' : 'Validation removed', 'success');
};

window.deleteIncident = function(incId) {
  const op = getActiveOp();
  op.incidents = op.incidents.filter(i => i.id !== incId);
  saveData(); renderIncidents();
  showToast('Incident removed');
};

function renderPagination(total) {
  const nav = document.getElementById('pageNav');
  nav.innerHTML = '';
  const prev = document.createElement('button'); prev.className = 'page-nav-btn'; prev.textContent = '‹';
  prev.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderIncidents(); } });
  nav.appendChild(prev);
  for (let i = 1; i <= total; i++) {
    const btn = document.createElement('button');
    btn.className = 'page-nav-btn' + (i === currentPage ? ' active-page' : '');
    btn.textContent = String(i).padStart(2, '0');
    btn.addEventListener('click', () => { currentPage = i; renderIncidents(); });
    nav.appendChild(btn);
  }
  const next = document.createElement('button'); next.className = 'page-nav-btn'; next.textContent = '›';
  next.addEventListener('click', () => { if (currentPage < total) { currentPage++; renderIncidents(); } });
  nav.appendChild(next);
}

function updateStats() {
  const op = getActiveOp();
  const inc = op.incidents;
  const hostiles = inc.filter(i => ['critical', 'high'].includes(i.priority)).length;
  const validated = inc.filter(i => i.status === 'validated').length;
  const neutral = inc.filter(i => i.priority === 'low').length;
  const integrity = inc.length > 0 ? Math.round((1 - hostiles / Math.max(inc.length, 1)) * 100) : 94;
  document.getElementById('statIntegrity').textContent = integrity;
  document.getElementById('integrityBar').style.width = integrity + '%';
  document.getElementById('statHostiles').textContent = String(hostiles).padStart(2, '0');
  document.getElementById('statCountermeasures').textContent = String(validated).padStart(2, '0');
  document.getElementById('statNeutral').textContent = String(neutral + 42);
}

// ── EVENTS ──
document.getElementById('opSelect').addEventListener('change', e => {
  activeOpId = parseInt(e.target.value);
  loadActiveOp();
});

document.getElementById('briefingArea').addEventListener('input', e => {
  const op = getActiveOp(); op.briefing = e.target.value; saveData();
});

// DELETE OPERATION
document.getElementById('deleteOpBtn').addEventListener('click', () => {
  if (operations.length <= 1) {
    showToast('Cannot delete the last operation', 'error');
    return;
  }
  const op = getActiveOp();
  if (confirm(`Are you sure you want to permanently delete OPERATION: ${op.name}?\nAll incidents within this dossier will be removed.`)) {
    operations = operations.filter(o => o.id !== activeOpId);
    activeOpId = operations[0].id;
    saveData();
    renderOpSelect();
    loadActiveOp();
    showToast('Operation deleted');
  }
});

// NEW OPERATION
document.getElementById('newOpBtn').addEventListener('click', () => openModal('newOpModal'));
document.getElementById('closeNewOp').addEventListener('click', () => closeModal('newOpModal'));
document.getElementById('cancelNewOp').addEventListener('click', () => closeModal('newOpModal'));
document.getElementById('confirmNewOp').addEventListener('click', () => {
  const name = document.getElementById('newOpName').value.trim();
  if (!name) { showToast('Operation name required', 'error'); return; }
  const dossier = document.getElementById('newOpDossier').value.trim() || 'Dossier #NEW · Classified Intelligence';
  const briefing = document.getElementById('newOpBriefing').value.trim() || '';
  const newOp = { id: nextOpId++, name: name.toUpperCase(), dossier, briefing, incidents: [] };
  operations.push(newOp);
  activeOpId = newOp.id;
  saveData(); renderOpSelect(); loadActiveOp();
  document.getElementById('newOpName').value = '';
  document.getElementById('newOpDossier').value = '';
  document.getElementById('newOpBriefing').value = '';
  closeModal('newOpModal');
  showToast('Operation created', 'success');
});

// NEW INCIDENT
document.getElementById('addIncidentBtn').addEventListener('click', () => openModal('newIncidentModal'));
document.getElementById('closeNewIncident').addEventListener('click', () => closeModal('newIncidentModal'));
document.getElementById('cancelNewIncident').addEventListener('click', () => closeModal('newIncidentModal'));
document.getElementById('confirmNewIncident').addEventListener('click', () => {
  const name = document.getElementById('newIncName').value.trim();
  if (!name) { showToast('Incident name required', 'error'); return; }
  const source = document.getElementById('newIncSource').value.trim() || 'Unknown Source';
  const priority = document.getElementById('newIncPriority').value;
  const affiliation = document.getElementById('newIncAffiliation').value;
  const desc = document.getElementById('newIncDesc').value.trim() || 'No description provided.';
  const customId = document.getElementById('newIncRecordId').value.trim();
  const id = nextIncId++;
  const now = new Date();
  const ts = `${now.getFullYear()}.${String(now.getMonth()+1).padStart(2,'0')}.${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
  const prefixes = ['PV','BS','UK','IW','SC','AL','GX','MK'];
  const autoId = prefixes[id % prefixes.length] + '-' + String(id * 113 % 90000 + 10000).slice(0, 5);
  const op = getActiveOp();
  op.incidents.unshift({ id, recordId: customId || autoId, name: name.toUpperCase(), source, priority, affiliation, desc, timestamp: ts, status: 'link', response: '' });
  saveData(); renderIncidents();
  document.getElementById('newIncRecordId').value = '';
  document.getElementById('newIncName').value = '';
  document.getElementById('newIncSource').value = '';
  document.getElementById('newIncDesc').value = '';
  closeModal('newIncidentModal');
  showToast('Incident added', 'success');
});

// LINK RESPONSE
let linkRespLinkedProfile = null; // track profile linked to this response

document.getElementById('closeLinkResponse').addEventListener('click', () => {
  linkRespLinkedProfile = null;
  closeModal('linkResponseModal');
});
document.getElementById('cancelLinkResponse').addEventListener('click', () => {
  linkRespLinkedProfile = null;
  closeModal('linkResponseModal');
});

// "Link Profile" button inside Link Response modal
document.getElementById('linkRespPickProfile').addEventListener('click', () => {
  // Store a callback so the picker knows to return here
  window._profilePickerCallback = (profile) => {
    linkRespLinkedProfile = profile;
    const tag = document.getElementById('linkRespProfileTag');
    tag.textContent = `↪ Linked profile: ${profile.name} (${(profile.affiliation || 'unknown').toUpperCase()})`;
    tag.style.display = 'block';
    // Also pre-fill unit field if it's blank
    const unitField = document.getElementById('linkRespUnit');
    if (!unitField.value.trim()) unitField.value = profile.name;
    closeModal('profilePickerModal');
    showToast(`Profile linked: ${profile.name}`, 'success');
  };
  renderProfilePickerList();
  document.getElementById('profilePickerSearch').value = '';
  openModal('profilePickerModal');
});

document.getElementById('confirmLinkResponse').addEventListener('click', () => {
  if (!linkResponseTargetId) return;
  const op = getActiveOp();
  const inc = op.incidents.find(i => i.id === linkResponseTargetId);
  if (!inc) return;
  const unit = document.getElementById('linkRespUnit').value.trim() || 'Unknown Unit';
  const type = document.getElementById('linkRespType').value;
  const ref = document.getElementById('linkRespRef').value.trim();
  const notes = document.getElementById('linkRespNotes').value.trim();
  const validate = document.getElementById('linkRespValidate').value === 'yes';
  let profileSuffix = '';
  if (linkRespLinkedProfile) profileSuffix = ` [Profile: ${linkRespLinkedProfile.name}]`;
  inc.response = `${unit} – ${type}${ref ? ' – ' + ref : ''}${notes ? ' | ' + notes : ''}${profileSuffix}`;
  if (validate) inc.status = 'validated';
  saveData(); renderIncidents();
  // Reset
  const tag = document.getElementById('linkRespProfileTag');
  tag.style.display = 'none'; tag.textContent = '';
  linkRespLinkedProfile = null;
  closeModal('linkResponseModal');
  showToast('Response linked' + (validate ? ' & validated ✓' : ''), 'success');
  linkResponseTargetId = null;
});

// PRINT
document.getElementById('printArchivesBtn').addEventListener('click', () => {
  showToast('Sending to print...', 'success');
  setTimeout(() => window.print(), 400);
});

// FILTERS
document.getElementById('applyFiltersBtn').addEventListener('click', () => openModal('filterModal'));
document.getElementById('closeFilter').addEventListener('click', () => closeModal('filterModal'));
document.getElementById('cancelFilter').addEventListener('click', () => closeModal('filterModal'));
document.getElementById('applyFilter').addEventListener('click', () => {
  filterPriority = document.getElementById('filterPriority').value;
  filterAffiliation = document.getElementById('filterAffiliation').value;
  filterSort = document.getElementById('filterSort').value;
  currentPage = 1; renderIncidents();
  closeModal('filterModal');
  showToast('Filters applied', 'success');
});

// SEARCH
document.getElementById('globalSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  document.querySelectorAll('.incident-card').forEach(card => {
    card.style.display = card.textContent.toLowerCase().includes(q) || !q ? '' : 'none';
  });
});

function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// PROFILE PICKER (for source field in new incident)
function renderProfilePickerList(filter = '') {
  const profiles = getActorProfiles();
  const list = document.getElementById('profilePickerList');
  list.innerHTML = '';
  const filtered = profiles.filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()));
  if (!filtered.length) {
    list.innerHTML = '<div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:12px;text-align:center;">No profiles found. Add profiles on the Actor Profiles page first.</div>';
    return;
  }
  filtered.forEach(p => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;padding:8px 10px;border:1.5px solid var(--border);border-radius:5px;cursor:pointer;transition:background 0.1s;';
    row.addEventListener('mouseenter', () => row.style.background = 'var(--bg2)');
    row.addEventListener('mouseleave', () => row.style.background = '');
    const affilColor = p.affiliation === 'allied' ? 'var(--allied)' : p.affiliation === 'hostile' ? 'var(--hostile)' : 'var(--text3)';
    row.innerHTML = `
      <div style="width:30px;height:30px;border-radius:4px;background:var(--bg2);border:1.5px solid ${affilColor};display:flex;align-items:center;justify-content:center;font-size:16px;overflow:hidden;flex-shrink:0;">
        ${p.photo ? `<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;">` : '👤'}
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:var(--mono);font-size:12px;font-weight:700;color:var(--text);">${p.name}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--text3);">${p.classification || ''} · <span style="color:${affilColor}">${p.affiliation?.toUpperCase() || 'UNKNOWN'}</span></div>
      </div>
      <button style="font-family:var(--mono);font-size:9px;font-weight:600;background:var(--text);color:var(--bg);border:none;border-radius:3px;padding:4px 10px;cursor:pointer;">SELECT</button>`;
    row.querySelector('button').addEventListener('click', () => {
      document.getElementById('newIncSource').value = p.name;
      if (!document.getElementById('newIncAffiliation').value) {
        document.getElementById('newIncAffiliation').value = p.affiliation || '';
      }
      closeModal('profilePickerModal');
      showToast(`Linked: ${p.name}`, 'success');
    });
    list.appendChild(row);
  });
}

document.getElementById('pickProfileSourceBtn').addEventListener('click', () => {
  renderProfilePickerList();
  document.getElementById('profilePickerSearch').value = '';
  openModal('profilePickerModal');
});
document.getElementById('profilePickerSearch').addEventListener('input', e => {
  renderProfilePickerList(e.target.value);
});
document.getElementById('closeProfilePicker').addEventListener('click', () => closeModal('profilePickerModal'));
document.getElementById('cancelProfilePicker').addEventListener('click', () => closeModal('profilePickerModal'));

// ── BACKUP & RESTORE ──
document.getElementById('backupBtn').addEventListener('click', () => openModal('backupModal'));
document.getElementById('closeBackup').addEventListener('click', () => closeModal('backupModal'));
document.getElementById('cancelBackup').addEventListener('click', () => closeModal('backupModal'));

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    nodes: JSON.parse(localStorage.getItem('intelNodes') || '[]'),
    edges: JSON.parse(localStorage.getItem('intelEdges') || '[]'),
    nextId: parseInt(localStorage.getItem('intelNextId') || '1'),
    operations: operations,
    activeOpId: activeOpId,
    nextOpId: nextOpId,
    timestamp: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Registry_Backup_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Database exported', 'success');
});

document.getElementById('triggerImportBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (confirm('Restore this backup? Current data will be replaced.')) {
        if (data.nodes) localStorage.setItem('intelNodes', JSON.stringify(data.nodes));
        if (data.edges) localStorage.setItem('intelEdges', JSON.stringify(data.edges));
        if (data.nextId) localStorage.setItem('intelNextId', data.nextId.toString());
        if (data.operations) localStorage.setItem('activeOperations', JSON.stringify(data.operations));
        if (data.activeOpId) localStorage.setItem('activeOpId', data.activeOpId.toString());
        if (data.nextOpId) localStorage.setItem('nextOpId', data.nextOpId.toString());
        location.reload();
      }
    } catch (err) {
      showToast('Invalid backup file', 'error');
    }
  };
  reader.readAsText(file);
});

// ── INIT ──
renderOpSelect();
loadActiveOp();
