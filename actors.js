// ═══════════════════════════════════════════════════════════════
// ACTORS.JS — Intelligence Registry: Actor Profiles
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'intel_actors_data';

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
const defaultData = {
  nodes: [
    { id: 1, name: 'AGENT WHISPER', affiliation: 'allied', x: 200, y: 200,
      classification: 'FIELD OPERATIVE', designation: '"WHISPER"',
      archetypeText: 'Field Operative', angelText: 'Protects civilians, intelligence liaison', demonText: '',
      photo: '',
      dob: '1985-07-22', nationality: 'American', address: '---', phone: '---',
      email: '---', linkedin: '---', instagram: '---', facebook: '---', twitter: '---',
      ties: ['NORTHERN COMMAND'],
      campaigns: [{ name: 'OP: CYBER_VANGUARD_2024', status: 'active' }],
      narrative: 'Undercover operative embedded in target network since 2021. Specialises in signals intelligence and counter-surveillance.',
      logs: [{ type: 'signal', meta: '6HRS AGO // SIGNAL INTEL', title: 'ASSET CHECK-IN', desc: 'Regular check-in confirmed. Position secure.' }]
    },
    { id: 2, name: 'VIPER UNK-01', affiliation: 'hostile', x: 400, y: 180,
      classification: 'UNKNOWN HOSTILE', designation: '"VIPER"',
      archetypeText: 'Shadow Operative', angelText: '', demonText: 'Targeted assassinations, network infiltration',
      photo: '',
      dob: '????', nationality: 'Unknown', address: 'Unknown', phone: 'Unknown',
      email: '---', linkedin: '---', instagram: '---', facebook: '---', twitter: '---',
      ties: ['VIPER SYNDICATE'],
      campaigns: [{ name: 'OP: SHADOW_TRACE', status: 'review' }],
      narrative: 'Unidentified hostile entity affiliated with Viper Syndicate. High threat level. Whereabouts unknown.',
      logs: [{ type: 'field', meta: '24HRS AGO // FIELD REPORT', title: 'LAST KNOWN POSITION', desc: 'Spotted near eastern ridge. Lost contact shortly after.' }]
    },
    { id: 3, name: 'M. SOKOLOV', affiliation: 'hostile', x: 300, y: 360,
      classification: 'TACTICAL COMMANDER', designation: '"THE ROOK"',
      archetypeText: 'Tactical Commander', angelText: '', demonText: 'Arms trafficking, coercion, asymmetric warfare',
      photo: '',
      dob: '1978-03-14', nationality: 'Russian Federation',
      address: '14 Kutuzovsky Prospekt, Moscow, Russia', phone: '+7 495 000-0000',
      email: 'm.sokolov@redacted.ru',
      linkedin: 'linkedin.com/in/m-sokolov-redacted',
      instagram: '@m_sokolov_redacted',
      facebook: 'facebook.com/m.sokolov.redacted',
      twitter: '@sokolov_redacted',
      ties: ['NORTHERN COMMAND', 'INTELLIGENCE DIVISION'],
      campaigns: [
        { name: 'OP: CYBER_VANGUARD_2024', status: 'active' },
        { name: 'OP: SHADOW_TRACE', status: 'review' }
      ],
      narrative: 'Subject Sokolov has maintained continuous operational status since 2018. Core competency involves high-risk extraction and asymmetrical tactical oversight.',
      logs: [
        { type: 'signal', meta: '2HRS AGO // SIGNAL INTEL', title: 'SATELLITE CONFIRMATION: DMZ SECTOR 4', desc: 'Visual lock established on primary transit route. Subject traveling with light escort.' },
        { type: 'field', meta: '14HRS AGO // FIELD REPORT', title: 'DIRECT CONTACT: VIPER RECON', desc: 'Brief engagement reported near eastern ridge line. No casualties reported.' }
      ]
    }
  ],
  edges: [
    { id: 1, from: 1, to: 3, type: 'allied' },
    { id: 2, from: 2, to: 3, type: 'hostile' }
  ]
};

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old archetype format to new 3-field format
      parsed.nodes = parsed.nodes.map(n => ({
        ...n,
        archetypeText: n.archetypeText || '',
        angelText: n.angelText || '',
        demonText: n.demonText || ''
      }));
      return parsed;
    }
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultData));
}

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges })); } catch (e) {}
  // Sync to global JSONBlob via Vercel Proxy to avoid CORS
  fetch('/api/sync?db=actors', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nodes, edges })
  }).catch(()=>{});
}

// Global Sync on boot
fetch('/api/sync?db=actors')
  .then(res => res.json())
  .then(data => {
    if(data && data.nodes) {
      nodes = data.nodes;
      if(data.edges) edges = data.edges;
      nextId = Math.max(...nodes.map(n => n.id), 0) + 10;
      nextEdgeId = Math.max(...edges.map(e => e.id), 0) + 10;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
      renderGraph();
      if(typeof renderProfileList === 'function') renderProfileList();
    }
  }).catch(()=>{});

function getOperationsFromCampaign() {
  try {
    const data = localStorage.getItem('intel_campaign_data');
    if (data) return JSON.parse(data);
  } catch (e) {}
  return [];
}

let { nodes, edges } = loadData();
let selectedNodeId = null;
let activeTool = 'select';
let connectSource = null;
let dragNode = null;
let dragOffset = { x: 0, y: 0 };
let scale = 1;
let nextId = Math.max(...nodes.map(n => n.id), 0) + 10;
let nextEdgeId = Math.max(...edges.map(e => e.id), 0) + 10;

const canvas = document.getElementById('graphCanvas');
const edgesGroup = document.getElementById('edgesGroup');
const nodesGroup = document.getElementById('nodesGroup');
const connectHint = document.getElementById('connectHint');

// ── RENDER ──
function renderGraph() {
  const bgGroup = document.getElementById('campaignBgGroup');
  bgGroup.innerHTML = '';
  edgesGroup.innerHTML = '';
  nodesGroup.innerHTML = '';

  const defs = canvas.querySelector('defs') || canvas.insertBefore(document.createElementNS('http://www.w3.org/2000/svg', 'defs'), canvas.firstChild);
  // Clear old campaign gradients
  defs.querySelectorAll('.campaign-grad').forEach(g => g.remove());

  // Calculate campaign groups for background bubbles
  const campMap = {};
  nodes.forEach(n => {
    if (n.campaigns && n.campaigns.length > 0) {
      n.campaigns.forEach(c => {
        if (!campMap[c.name]) campMap[c.name] = { name: c.name, nodes: [] };
        campMap[c.name].nodes.push(n);
      });
    }
  });

  // Draw background bubbles
  Object.keys(campMap).forEach(key => {
    const group = campMap[key];
    const nodesInCamp = group.nodes;
    if (nodesInCamp.length === 0) return;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    nodesInCamp.forEach(n => {
      minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
      minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
    });

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.max(maxX - minX + 100, maxY - minY + 100) / 2 + 20;

    const bubble = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bubble.setAttribute('cx', cx); bubble.setAttribute('cy', cy);
    bubble.setAttribute('r', r);
    bubble.setAttribute('fill', getCampaignColor(group.name));
    bubble.setAttribute('fill-opacity', '0.08');
    bubble.setAttribute('stroke', getCampaignColor(group.name));
    bubble.setAttribute('stroke-width', '2');
    bubble.setAttribute('stroke-opacity', '0.4');

    bgGroup.appendChild(bubble);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', cx); label.setAttribute('y', cy - r - 10);
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('font-family', 'var(--mono)');
    label.setAttribute('font-size', '10');
    label.setAttribute('font-weight', '700');
    label.setAttribute('fill', getCampaignColor(group.name));
    label.setAttribute('opacity', '0.5');
    label.textContent = group.name;
    bgGroup.appendChild(label);
  });

  // Edges
  edges.forEach(e => {
    const from = nodes.find(n => n.id === e.from);
    const to = nodes.find(n => n.id === e.to);
    if (!from || !to) return;

    const isHostile = e.type === 'hostile';
    const edgeColor = isHostile ? getHostileColor(e.from) : getAlliedColor(e.from);
    const mx = (from.x + to.x) / 2, my = (from.y + to.y) / 2;

    // Straight line for all connections
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x); line.setAttribute('y1', from.y);
    line.setAttribute('x2', to.x); line.setAttribute('y2', to.y);
    line.setAttribute('stroke', edgeColor);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('opacity', '0.85');
    if (isHostile) {
      line.setAttribute('stroke-dasharray', '8 5');
    }
    edgesGroup.appendChild(line);

    // Delete button at midpoint
    const delCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    delCircle.setAttribute('cx', mx); delCircle.setAttribute('cy', my);
    delCircle.setAttribute('r', '8'); delCircle.setAttribute('fill', '#f0ede6');
    delCircle.setAttribute('stroke', edgeColor); delCircle.setAttribute('stroke-width', '1.5');
    delCircle.style.cursor = 'pointer';
    delCircle.addEventListener('click', ev => { ev.stopPropagation(); edges = edges.filter(x => x.id !== e.id); saveData(); renderGraph(); showToast('Connection removed'); });
    const xMark = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xMark.setAttribute('x', mx); xMark.setAttribute('y', my + 3.5);
    xMark.setAttribute('text-anchor', 'middle'); xMark.setAttribute('font-size', '10');
    xMark.setAttribute('fill', edgeColor); xMark.style.pointerEvents = 'none'; xMark.textContent = '×';
    edgesGroup.appendChild(delCircle);
    edgesGroup.appendChild(xMark);
  });

  // Nodes
  nodes.forEach(node => {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('transform', `translate(${node.x},${node.y})`);
    g.style.cursor = activeTool === 'connect' ? 'crosshair' : 'pointer';

    const isSelected = node.id === selectedNodeId;
    
    // COLOR LOGIC — unique colour per node from affiliation palette
    let nodeColor = '#7a7a74'; // fallback
    if (node.affiliation === 'allied') {
      nodeColor = getAlliedColor(node.id);
    } else if (node.affiliation === 'hostile') {
      nodeColor = getHostileColor(node.id);
    } else if (node.campaigns && node.campaigns.length > 0) {
      nodeColor = getCampaignColor(node.campaigns[0].name);
    }

    if (isSelected) {
      const glow = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      glow.setAttribute('x', '-30'); glow.setAttribute('y', '-30');
      glow.setAttribute('width', '60'); glow.setAttribute('height', '60');
      glow.setAttribute('rx', '6'); glow.setAttribute('fill', 'none');
      glow.setAttribute('stroke', (nodeColor.startsWith('url') ? '#7a7a74' : nodeColor)); 
      glow.setAttribute('stroke-width', '3'); glow.setAttribute('opacity', '0.4');
      g.appendChild(glow);
    }

    const frame = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    frame.setAttribute('x', '-24'); frame.setAttribute('y', '-24');
    frame.setAttribute('width', '48'); frame.setAttribute('height', '48');
    frame.setAttribute('rx', '4'); frame.setAttribute('fill', '#ddd9d0');
    frame.setAttribute('stroke', nodeColor); frame.setAttribute('stroke-width', isSelected ? '2.5' : '1.5');
    if (node.affiliation === 'hostile') {
      frame.setAttribute('stroke-dasharray', '5 4');
    }
    g.appendChild(frame);

    if (node.photo) {
      let cp = document.getElementById('cp-node-' + node.id);
      if (!cp) {
        cp = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
        cp.setAttribute('id', 'cp-node-' + node.id);
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        r.setAttribute('x', '-24'); r.setAttribute('y', '-24');
        r.setAttribute('width', '48'); r.setAttribute('height', '48'); r.setAttribute('rx', '4');
        cp.appendChild(r); defs.appendChild(cp);
      }
      const img = document.createElementNS('http://www.w3.org/2000/svg', 'image');
      img.setAttribute('x', '-24'); img.setAttribute('y', '-24');
      img.setAttribute('width', '48'); img.setAttribute('height', '48');
      img.setAttribute('href', node.photo);
      img.setAttribute('clip-path', `url(#cp-node-${node.id})`);
      img.setAttribute('preserveAspectRatio', 'xMidYMid slice');
      img.style.pointerEvents = 'none';
      g.appendChild(img);
    } else {
      const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      t.setAttribute('x', '0'); t.setAttribute('y', '7');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '24');
      t.style.pointerEvents = 'none'; t.textContent = '👤';
      g.appendChild(t);
    }

    // Archetype icon
    const archIcons = { demon: '😈', angel: '😇', asset: '🎯', handler: '🕵', unknown: '' };
    if (archIcons[node.archetype]) {
      const archT = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      archT.setAttribute('x', '-16'); archT.setAttribute('y', '-14');
      archT.setAttribute('font-size', '12'); archT.style.pointerEvents = 'none';
      archT.textContent = archIcons[node.archetype];
      g.appendChild(archT);
    }

    // Name label
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', '0'); label.setAttribute('y', '38');
    label.setAttribute('text-anchor', 'middle'); label.setAttribute('font-size', '10');
    label.setAttribute('font-family', 'IBM Plex Mono, monospace'); label.setAttribute('font-weight', '600');
    label.setAttribute('fill', isSelected ? (nodeColor.startsWith('url') ? '#1a1a18' : nodeColor) : '#1a1a18'); 
    label.style.pointerEvents = 'none';
    label.textContent = node.name;
    g.appendChild(label);

    g.addEventListener('mousedown', e => onNodeMouseDown(e, node));
    g.addEventListener('click', e => { e.stopPropagation(); onNodeClick(node); });
    nodesGroup.appendChild(g);
  });
}

function onNodeClick(node) {
  if (activeTool === 'connect') {
    if (!connectSource) {
      connectSource = node;
      renderGraph();
      connectHint.textContent = `Source: ${node.name} — now click the target node. ESC to cancel.`;
    } else if (connectSource.id !== node.id) {
      const eType = (node.affiliation === 'hostile' || connectSource.affiliation === 'hostile') ? 'hostile' : 'allied';
      edges.push({ id: nextEdgeId++, from: connectSource.id, to: node.id, type: eType });
      showToast(`Connected: ${connectSource.name} → ${node.name}`, 'success');
      connectSource = null;
      connectHint.textContent = 'Click a source node, then a target node. Press ESC to cancel.';
      saveData(); renderGraph();
    }
    return;
  }
  if (activeTool === 'delete') {
    nodes = nodes.filter(n => n.id !== node.id);
    edges = edges.filter(e => e.from !== node.id && e.to !== node.id);
    if (selectedNodeId === node.id) { selectedNodeId = null; showDetailPanel(null); }
    saveData(); renderGraph(); showToast('Profile deleted');
    return;
  }
  selectedNodeId = node.id;
  showDetailPanel(node);
  renderGraph();
}

function onNodeMouseDown(e, node) {
  if (activeTool !== 'select') return;
  e.stopPropagation();
  dragNode = node;
  const r = canvas.getBoundingClientRect();
  dragOffset.x = e.clientX - r.left - node.x;
  dragOffset.y = e.clientY - r.top - node.y;
}

canvas.addEventListener('mousemove', e => {
  if (!dragNode) return;
  const r = canvas.getBoundingClientRect();
  dragNode.x = e.clientX - r.left - dragOffset.x;
  dragNode.y = e.clientY - r.top - dragOffset.y;
  renderGraph();
});
canvas.addEventListener('mouseup', () => { if (dragNode) { saveData(); dragNode = null; } });
canvas.addEventListener('click', () => {
  if (activeTool === 'select') { selectedNodeId = null; showDetailPanel(null); renderGraph(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { connectSource = null; connectHint.classList.add('hidden'); setTool('select'); }
});

// ── DETAIL PANEL ──
function showDetailPanel(node) {
  const noSel = document.getElementById('noSelection');
  const detail = document.getElementById('profileDetail');
  if (!node) { noSel.classList.remove('hidden'); detail.classList.add('hidden'); return; }
  noSel.classList.add('hidden'); detail.classList.remove('hidden');

  // Badge
  const badge = document.getElementById('detailBadge');
  const col = node.affiliation === 'allied' ? 'var(--allied)' : 'var(--hostile)';
  badge.style.color = col; badge.style.borderColor = col;

  // Photo
  const img = document.getElementById('profilePhotoImg');
  const placeholder = document.getElementById('photoPlaceholder');
  const frame = document.getElementById('photoFrame');
  const removeBtn = document.getElementById('removePhotoBtn');
  if (node.photo) {
    img.src = node.photo; img.classList.remove('hidden');
    placeholder.style.display = 'none';
    frame.classList.add('has-photo');
    removeBtn.classList.remove('hidden');
  } else {
    img.src = ''; img.classList.add('hidden');
    placeholder.style.display = 'flex';
    frame.classList.remove('has-photo');
    removeBtn.classList.add('hidden');
  }

  // Fields
  document.getElementById('detailClassification').textContent = node.classification;
  document.getElementById('detailDesignation').textContent = node.designation;
  document.getElementById('detailName').textContent = node.name;
  document.getElementById('detailAffiliation').value = node.affiliation;
  document.getElementById('detailDOB').textContent = node.dob;
  document.getElementById('detailNationality').textContent = node.nationality;
  document.getElementById('detailAddress').textContent = node.address;
  document.getElementById('detailPhone').textContent = node.phone;
  document.getElementById('detailEmail').textContent = node.email;
  document.getElementById('detailLinkedIn').textContent = node.linkedin || '';
  document.getElementById('detailInstagram').textContent = node.instagram || '';
  document.getElementById('detailFacebook').textContent = node.facebook || '';
  document.getElementById('detailTwitter').textContent = node.twitter || '';
  document.getElementById('detailNarrative').value = node.narrative;

  // Archetype 3 text fields
  document.getElementById('archetypeText').textContent = node.archetypeText || '';
  document.getElementById('angelText').textContent = node.angelText || '';
  document.getElementById('demonText').textContent = node.demonText || '';

  // Ties
  const tiesContainer = document.getElementById('tiesContainer');
  tiesContainer.innerHTML = '';
  (node.ties || []).forEach(tie => {
    const tag = document.createElement('div'); tag.className = 'tie-tag';
    tag.textContent = tie;
    tag.title = 'Click to remove';
    tag.addEventListener('click', () => { node.ties = node.ties.filter(t => t !== tie); saveData(); showDetailPanel(node); });
    tiesContainer.appendChild(tag);
  });
  const addTie = document.createElement('button'); addTie.className = 'tie-add'; addTie.textContent = '+ Add Tie';
  addTie.addEventListener('click', () => openModal('addTieModal')); tiesContainer.appendChild(addTie);

  // Campaigns
  renderCampaigns(node);

  // Logs
  renderLogEntries(node);
}

// ── AFFILIATION COLOUR PALETTES ──
const ALLIED_COLORS = [
  '#b3d4f0', // Very light Steel Blue
  '#b5ebd0', // Very light Emerald
  '#8be6d3', // Very light Teal
  '#b3d9f5', // Very light Dodger Blue
  '#a3dfbb', // Very light Forest Green
  '#9ce6d6', // Very light Dark Teal
  '#adcce6', // Very light Belize Blue
  '#bdf0e4', // Very light Medium Aquamarine
  '#c9ecfa', // Very light Sky Blue
  '#abedd0', // Very light Medium Sea Green
  '#b1e6dc', // Very light Cadet Blue
  '#a0cbeb', // Very light Vivid Blue
];

const HOSTILE_COLORS = [
  '#8a2318', // Dark Alizarin
  '#8f5119', // Dark Carrot Orange
  '#782017', // Dark Pomegranate
  '#8a3c0b', // Dark Pumpkin
  '#8f244c', // Dark Hot Pink
  '#75140b', // Dark Red
  '#9e6d19', // Dark Orange
  '#822416', // Dark Brick Red
  '#783a0e', // Dark Burnt Orange
  '#8f281e', // Dark Crimson
  '#661b14', // Darker Crimson
  '#993535', // Dark Salmon Red
];

function getAlliedColor(id) {
  return ALLIED_COLORS[Math.abs(id) % ALLIED_COLORS.length];
}

function getHostileColor(id) {
  return HOSTILE_COLORS[Math.abs(id) % HOSTILE_COLORS.length];
}

function getCampaignColor(name) {
  const colors = [
    '#8ea287', // Sage
    '#bb8e8e', // Dusty Rose
    '#7e92a8', // Slate Blue
    '#d9b48f', // Ochre
    '#9f8bb3', // Muted Lavender
    '#c47d6e', // Terracotta
    '#828a6f', // Olive
    '#c8b9a6', // Sandstone
    '#8c6b8c', // Plum
    '#6b9e9e', // Soft Teal
    '#ccac6b', // Muted Mustard
    '#d68f7d', // Soft Coral
    '#8fb69f', // Mint
    '#6b7da8', // Soft Indigo
    '#a28795', // Mauve
    '#879ea2'  // Air Blue
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function renderCampaigns(node) {
  const campContainer = document.getElementById('campaignsContainer');
  campContainer.innerHTML = '';
  
  if (!node.campaigns || node.campaigns.length === 0) {
    campContainer.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--text3);font-style:italic;padding:10px;text-align:center;width:100%;">No linked campaigns.</div>';
  } else {
    node.campaigns.forEach((camp, idx) => {
      const color = getCampaignColor(camp.name);
      const wrapper = document.createElement('div');
      wrapper.className = 'campaign-bubble-wrapper';
      wrapper.style.zIndex = 10 - idx;
      
      wrapper.innerHTML = `
        <div class="campaign-bubble" style="background-color: ${color}">
          <span>${camp.name}</span>
          <button class="campaign-remove-inner" title="Remove link">×</button>
        </div>
      `;
      
      wrapper.querySelector('.campaign-remove-inner').addEventListener('click', (e) => {
        e.stopPropagation();
        node.campaigns.splice(idx, 1);
        saveData();
        renderCampaigns(node);
      });
      
      campContainer.appendChild(wrapper);
    });
  }

  const addRow = document.createElement('div');
  addRow.style.width = '100%';
  addRow.style.display = 'flex';
  addRow.style.justifyContent = 'center';
  addRow.style.marginTop = '10px';
  
  const addCamp = document.createElement('button');
  addCamp.className = 'tie-add';
  addCamp.textContent = '+ Link Campaign';
  addCamp.addEventListener('click', () => {
    const ops = getOperationsFromCampaign();
    const sel = document.getElementById('campaignOpSelect');
    sel.innerHTML = '<option value="">— Choose an operation —</option>';
    ops.forEach(op => {
      const opt = document.createElement('option');
      opt.value = op.name; opt.textContent = op.name;
      sel.appendChild(opt);
    });
    document.getElementById('newCampaignName').value = '';
    openModal('addCampaignModal');
  });
  
  addRow.appendChild(addCamp);
  campContainer.appendChild(addRow);
}

function renderLogEntries(node) {
  const container = document.getElementById('surveillanceLog');
  container.innerHTML = '';
  (node.logs || []).forEach((log, idx) => {
    const entry = document.createElement('div'); entry.className = 'log-entry'; entry.setAttribute('data-type', log.type);
    entry.innerHTML = `
      <div class="log-dot ${log.type === 'signal' ? 'allied' : 'hostile'}"></div>
      <div class="log-body">
        <div class="log-meta">${log.meta}</div>
        <div class="log-title" contenteditable="true">${log.title}</div>
        <div class="log-desc" contenteditable="true">${log.desc}</div>
      </div>
      <button class="remove-btn" title="Remove">✕</button>`;
    entry.querySelector('.remove-btn').addEventListener('click', () => { node.logs.splice(idx, 1); saveData(); renderLogEntries(node); });
    container.appendChild(entry);
  });
}

// ── PHOTO UPLOAD ──
document.getElementById('photoUpload').addEventListener('change', e => {
  const file = e.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const node = nodes.find(n => n.id === selectedNodeId); if (!node) return;
    node.photo = ev.target.result;
    saveData(); showDetailPanel(node); renderGraph();
    showToast('Photo uploaded', 'success');
  };
  reader.readAsDataURL(file);
  e.target.value = '';
});

window.removePhoto = function() {
  const node = nodes.find(n => n.id === selectedNodeId); if (!node) return;
  node.photo = '';
  saveData(); showDetailPanel(node); renderGraph();
  showToast('Photo removed');
};

// ── SAVE ──
document.getElementById('saveProfileBtn').addEventListener('click', () => {
  if (!selectedNodeId) return;
  const node = nodes.find(n => n.id === selectedNodeId); if (!node) return;
  node.classification = document.getElementById('detailClassification').textContent.trim();
  node.designation = document.getElementById('detailDesignation').textContent.trim();
  node.name = document.getElementById('detailName').textContent.trim();
  node.affiliation = document.getElementById('detailAffiliation').value;

  // Archetype 3 text fields
  node.archetypeText = document.getElementById('archetypeText').textContent.trim();
  node.angelText = document.getElementById('angelText').textContent.trim();
  node.demonText = document.getElementById('demonText').textContent.trim();

  node.dob = document.getElementById('detailDOB').textContent.trim();
  node.nationality = document.getElementById('detailNationality').textContent.trim();
  node.address = document.getElementById('detailAddress').textContent.trim();
  node.phone = document.getElementById('detailPhone').textContent.trim();
  node.email = document.getElementById('detailEmail').textContent.trim();
  node.linkedin = document.getElementById('detailLinkedIn').textContent.trim();
  node.instagram = document.getElementById('detailInstagram').textContent.trim();
  node.facebook = document.getElementById('detailFacebook').textContent.trim();
  node.twitter = document.getElementById('detailTwitter').textContent.trim();
  node.narrative = document.getElementById('detailNarrative').value;

  // Save log entries
  node.logs = [];
  document.querySelectorAll('.log-entry').forEach(el => {
    node.logs.push({
      type: el.getAttribute('data-type'),
      meta: el.querySelector('.log-meta').textContent,
      title: el.querySelector('.log-title').textContent.trim(),
      desc: el.querySelector('.log-desc').textContent.trim()
    });
  });
  saveData(); renderGraph(); showToast('Profile saved', 'success');
});

document.getElementById('deleteProfileBtn').addEventListener('click', () => {
  if (!selectedNodeId) return;
  nodes = nodes.filter(n => n.id !== selectedNodeId);
  edges = edges.filter(e => e.from !== selectedNodeId && e.to !== selectedNodeId);
  selectedNodeId = null; showDetailPanel(null); saveData(); renderGraph();
  showToast('Profile deleted');
});

// ── TOOLS (with toggle) ──
function setTool(name) {
  if (name === activeTool && name !== 'select') { setTool('select'); return; }
  activeTool = name;
  document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active', 'connect-active'));
  connectHint.classList.add('hidden');
  connectSource = null;
  canvas.style.cursor = 'default';
  if (name === 'select') {
    document.getElementById('toolSelect').classList.add('active');
  } else if (name === 'connect') {
    document.getElementById('toolConnect').classList.add('connect-active');
    canvas.style.cursor = 'crosshair';
    connectHint.classList.remove('hidden');
  } else if (name === 'delete') {
    document.getElementById('toolDelete').classList.add('active');
    canvas.style.cursor = 'not-allowed';
  }
}

document.getElementById('toolSelect').addEventListener('click', () => setTool('select'));
document.getElementById('toolConnect').addEventListener('click', () => setTool('connect'));
document.getElementById('toolDelete').addEventListener('click', () => setTool('delete'));
document.getElementById('toolAddAllied').addEventListener('click', () => {
  document.getElementById('newProfileAffiliation').value = 'allied';
  openModal('addProfileModal');
});
document.getElementById('toolAddHostile').addEventListener('click', () => {
  document.getElementById('newProfileAffiliation').value = 'hostile';
  openModal('addProfileModal');
});

document.getElementById('zoomIn').addEventListener('click', () => { scale = Math.min(2.5, scale + 0.15); document.getElementById('campaignBgGroup').setAttribute('transform', `scale(${scale})`); nodesGroup.setAttribute('transform', `scale(${scale})`); edgesGroup.setAttribute('transform', `scale(${scale})`); });
document.getElementById('zoomOut').addEventListener('click', () => { scale = Math.max(0.3, scale - 0.15); document.getElementById('campaignBgGroup').setAttribute('transform', `scale(${scale})`); nodesGroup.setAttribute('transform', `scale(${scale})`); edgesGroup.setAttribute('transform', `scale(${scale})`); });

// ── MODALS ──
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

document.getElementById('closeAddProfile').addEventListener('click', () => closeModal('addProfileModal'));
document.getElementById('cancelAddProfile').addEventListener('click', () => closeModal('addProfileModal'));
document.getElementById('confirmAddProfile').addEventListener('click', () => {
  const name = document.getElementById('newProfileName').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const aff = document.getElementById('newProfileAffiliation').value;
  const cls = document.getElementById('newProfileClass').value.trim() || 'UNCLASSIFIED';
  const des = document.getElementById('newProfileDesig').value.trim() || '---';
  const r = canvas.getBoundingClientRect();
  const newNode = {
    id: nextId++, name: name.toUpperCase(), affiliation: aff,
    x: 100 + Math.random() * (r.width - 200), y: 100 + Math.random() * (r.height - 200),
    classification: cls, designation: des,
    archetype: 'unknown', archetypeText: '', angelText: '', demonText: '',
    photo: '',
    dob: '---', nationality: '---', address: '---', phone: '---', email: '---',
    linkedin: '---', instagram: '---', facebook: '---', twitter: '---',
    ties: [], campaigns: [], narrative: '', logs: []
  };
  nodes.push(newNode); saveData(); renderGraph();
  document.getElementById('newProfileName').value = '';
  document.getElementById('newProfileClass').value = '';
  document.getElementById('newProfileDesig').value = '';
  closeModal('addProfileModal');
  showToast('Profile created', 'success');
  selectedNodeId = newNode.id; showDetailPanel(newNode);
});

document.getElementById('closeAddTie').addEventListener('click', () => closeModal('addTieModal'));
document.getElementById('cancelAddTie').addEventListener('click', () => closeModal('addTieModal'));
document.getElementById('confirmAddTie').addEventListener('click', () => {
  const name = document.getElementById('newTieName').value.trim();
  if (!name) { showToast('Name required', 'error'); return; }
  const node = nodes.find(n => n.id === selectedNodeId);
  if (node) { node.ties.push(name.toUpperCase()); saveData(); showDetailPanel(node); }
  document.getElementById('newTieName').value = '';
  closeModal('addTieModal'); showToast('Tie added', 'success');
});

// Campaign modal — linked to campaign tracker
document.getElementById('closeAddCampaign').addEventListener('click', () => closeModal('addCampaignModal'));
document.getElementById('cancelAddCampaign').addEventListener('click', () => closeModal('addCampaignModal'));

// When an operation is selected from the dropdown, pre-fill the text input
document.getElementById('campaignOpSelect').addEventListener('change', e => {
  const val = e.target.value;
  if (val) document.getElementById('newCampaignName').value = val;
});

document.getElementById('confirmAddCampaign').addEventListener('click', () => {
  // Prefer the dropdown value, fall back to manual input
  const selectedOp = document.getElementById('campaignOpSelect').value;
  const manualName = document.getElementById('newCampaignName').value.trim();
  const name = selectedOp || manualName;
  if (!name) { showToast('Campaign name required', 'error'); return; }
  const status = document.getElementById('newCampaignStatus').value;
  const node = nodes.find(n => n.id === selectedNodeId);
  if (node) {
    // Don't add duplicate
    const already = node.campaigns.find(c => c.name === name.toUpperCase());
    if (already) { showToast('Already linked', 'error'); return; }
    node.campaigns.push({ name: name.toUpperCase(), status });
    saveData(); renderCampaigns(node);
  }
  document.getElementById('newCampaignName').value = '';
  document.getElementById('campaignOpSelect').value = '';
  closeModal('addCampaignModal'); showToast('Campaign linked', 'success');
});

document.getElementById('closeAddLog').addEventListener('click', () => closeModal('addLogModal'));
document.getElementById('cancelAddLog').addEventListener('click', () => closeModal('addLogModal'));
document.getElementById('addLogBtn').addEventListener('click', () => openModal('addLogModal'));
document.getElementById('confirmAddLog').addEventListener('click', () => {
  const meta = document.getElementById('newLogMeta').value.trim();
  const title = document.getElementById('newLogTitle').value.trim();
  const desc = document.getElementById('newLogDesc').value.trim();
  const type = document.getElementById('newLogType').value;
  if (!title) { showToast('Title required', 'error'); return; }
  const node = nodes.find(n => n.id === selectedNodeId);
  if (node) { node.logs.unshift({ type, meta: meta || 'JUST NOW // ENTRY', title, desc }); saveData(); renderLogEntries(node); }
  document.getElementById('newLogMeta').value = '';
  document.getElementById('newLogTitle').value = '';
  document.getElementById('newLogDesc').value = '';
  closeModal('addLogModal'); showToast('Log entry added', 'success');
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// Global search
document.getElementById('globalSearch').addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  nodesGroup.querySelectorAll('g').forEach((g, i) => {
    const node = nodes[i]; if (!node) return;
    g.style.opacity = (!q || node.name.toLowerCase().includes(q)) ? '1' : '0.2';
  });
});

// ── BACKUP & RESTORE ──
document.getElementById('backupBtn').addEventListener('click', () => openModal('backupModal'));
document.getElementById('closeBackup').addEventListener('click', () => closeModal('backupModal'));
document.getElementById('cancelBackup').addEventListener('click', () => closeModal('backupModal'));

document.getElementById('exportBtn').addEventListener('click', () => {
  const data = {
    nodes: nodes,
    edges: edges,
    nextId: nextId,
    operations: JSON.parse(localStorage.getItem('activeOperations') || '[]'),
    activeOpId: parseInt(localStorage.getItem('activeOpId') || '1'),
    nextOpId: parseInt(localStorage.getItem('nextOpId') || '1'),
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
renderGraph();
