// ═══════════════════════════════════════════════════════════════
// DOSSIER.JS — War Monitor: Intelligence Repository
// ═══════════════════════════════════════════════════════════════

const STORAGE_KEY = 'intel_dossier_data';

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
const defaultFolders = [
  {
    id: 1, name: 'Donbas Region', status: 'active', size: '820 GB',
    items: [
      { id: 1, name: 'Drone_B34_Sector7.mp4', type: 'video', size: '1.2 GB', date: '2HRS AGO', tags: ['aerial', 'verified'], notes: 'UNIT-4 aerial drone footage. REC 03:42.', dataUrl: '' },
      { id: 2, name: 'Shell_Remnants_01.jpg', type: 'image', size: '4.1 MB', date: '5HRS AGO', tags: ['ballistics'], notes: 'OSINT-A captured. Ballistics analysis pending.', dataUrl: '' },
      { id: 3, name: 'Radio_Intercept_Ch4.wav', type: 'audio', size: '88 MB', date: '8HRS AGO', tags: ['sigint'], notes: 'Channel 4 intercept. 12:44 duration. SIGINT division.', dataUrl: '' },
      { id: 4, name: 'Log_Capture_2023.png', type: 'image', size: '1.2 MB', date: '1DAY AGO', tags: ['system-log'], notes: 'System generated log capture.', dataUrl: '' }
    ]
  },
  {
    id: 2, name: 'Levant Basin', status: 'review', size: '142 GB',
    items: [
      { id: 5, name: 'Coastal_Survey_V2.mp4', type: 'video', size: '2.4 GB', date: '1DAY AGO', tags: ['aerial', 'verified'], notes: 'Naval survey footage.', dataUrl: '' },
      { id: 6, name: 'Intel_Brief_LB_07.pdf', type: 'document', size: '14 MB', date: '2DAYS AGO', tags: [], notes: 'Classified intelligence briefing.', dataUrl: '' }
    ]
  },
  {
    id: 3, name: 'Sahel Strip', status: 'archived', size: '2.1 TB',
    items: [
      { id: 7, name: 'Ground_Recon_Alpha.mp4', type: 'video', size: '890 MB', date: '1WEEK AGO', tags: ['verified'], notes: 'Ground reconnaissance mission Alpha.', dataUrl: '' },
      { id: 8, name: 'Signal_Log_SS_012.csv', type: 'data', size: '2.1 MB', date: '1WEEK AGO', tags: ['sigint'], notes: 'Signal intelligence log export.', dataUrl: '' }
    ]
  }
];

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return JSON.parse(JSON.stringify(defaultFolders));
}

function saveData() {
  // Don't save large dataUrls directly - only save metadata
  try {
    const toSave = folders.map(f => ({
      ...f,
      items: f.items.map(item => ({ ...item }))
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (e) {
    // If quota exceeded (large files), save without dataUrls
    try {
      const toSave = folders.map(f => ({
        ...f,
        items: f.items.map(item => ({ ...item, dataUrl: '' }))
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (e2) {}
  }
}

let folders = loadData();
let currentView = 'root';
let currentFolderId = null;
let activeNav = 'dossier';
let viewMode = 'grid';
let nextFolderId = Math.max(...folders.map(f => f.id), 0) + 10;
let nextFileId = Math.max(...folders.flatMap(f => f.items.map(i => i.id)), 0) + 10;
let viewerCurrentItem = null;
let viewerCurrentFolderId = null;

const main = document.getElementById('warMain');

// ── NAVIGATION ──
window.setNav = function(nav, el) {
  activeNav = nav;
  document.querySelectorAll('.sidebar-nav-item').forEach(e => e.classList.remove('active'));
  el.classList.add('active');
  currentView = 'root';
  currentFolderId = null;
  renderMain();
};

// ── FILE TYPE ICONS ──
const icons = { video: '🎬', image: '🖼', audio: '🎵', document: '📄', data: '📊' };
const thumbColors = { video: '#2c2c3a', image: '#3a2c1a', audio: '#1a2c3a', document: '#2a2a2a', data: '#1a3a2c' };

// ── RENDER MAIN ──
function renderMain() {
  if (activeNav === 'dossier') {
    if (currentView === 'root') renderRootView();
    else renderFolderView(currentFolderId);
  } else if (activeNav === 'conflict') {
    renderPlaceholder('🗺', 'Conflict Map', 'Interactive conflict mapping module. Geospatial intelligence visualization coming soon.');
  } else if (activeNav === 'history') {
    renderPlaceholder('📰', 'Historical Feed', 'Chronological intelligence feed. Browse archived events and timeline data.');
  } else if (activeNav === 'signal') {
    renderPlaceholder('📡', 'Signal Intel', 'Intercepted signal intelligence logs. Encrypted communications analysis.');
  }
}

function renderPlaceholder(icon, title, desc) {
  main.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60%;gap:16px;color:var(--text3);">
    <div style="font-size:48px;">${icon}</div>
    <div style="font-size:20px;font-weight:700;color:var(--text);">${title}</div>
    <div style="font-size:13px;text-align:center;max-width:400px;line-height:1.6;">${desc}</div>
    <div style="font-family:var(--mono);font-size:11px;border:1px solid var(--border);padding:8px 20px;border-radius:4px;">MODULE COMING SOON</div>
  </div>`;
}

// ── ROOT VIEW ──
function renderRootView() {
  const foldersHtml = folders.map(f => `
    <div class="folder-card" onclick="openFolder(${f.id})" id="folder-${f.id}">
      <span class="folder-badge ${f.status}">${f.status.toUpperCase()}</span>
      <div class="folder-icon">📁</div>
      <div class="folder-name">${f.name}</div>
      <div class="folder-meta">${f.items.length.toLocaleString()} FILES · ${f.size}</div>
    </div>`).join('');

  main.innerHTML = `
    <div class="war-title-row">
      <div class="war-title-block">
        <div><span class="confidential-badge">CONFIDENTIAL</span><span class="ts-id">TS-ID: 8449-ARCH</span></div>
        <div class="war-page-title">Intelligence Repository</div>
        <div class="war-page-desc">Managed central archive for cross-media conflict documentation, evidentiary logs, and verified field reconnaissance.</div>
      </div>
      <div class="view-controls">
        <div class="view-toggle">
          <button class="view-toggle-btn ${viewMode==='grid'?'active':''}" onclick="setViewMode('grid')" title="Grid view">⊞</button>
          <button class="view-toggle-btn ${viewMode==='list'?'active':''}" onclick="setViewMode('list')" title="List view">☰</button>
        </div>
        <button class="filter-btn" onclick="showToast('Filters panel — use Add Folder to manage dossiers')">⊟ Filter</button>
      </div>
    </div>
    <div class="breadcrumb">
      <span class="breadcrumb-current">🔒 ROOT</span>
      <span class="breadcrumb-sep">›</span>
      <span class="breadcrumb-current">ACTIVE DOSSIERS</span>
    </div>
    <div class="dossier-section-label">REGIONAL DOSSIERS</div>
    <div class="folders-grid" id="foldersGrid">
      ${foldersHtml}
      <div class="folder-card add-folder" onclick="openModal('addFolderModal')">
        <div class="folder-add-icon">+</div>
        <div class="folder-add-label">ADD NEW DOSSIER</div>
      </div>
    </div>
    ${folders.length > 0 ? `
    <div class="evidence-section-header">
      <div class="dossier-section-label" style="margin:0">RECENT EVIDENCE: ${folders[0].name.toUpperCase()} DOSSIER</div>
      <a class="expand-link" onclick="openFolder(${folders[0].id})">EXPAND FULL ARCHIVE →</a>
    </div>
    <div class="evidence-grid">
      ${renderEvidenceCards(folders[0])}
    </div>` : ''}`;
}

function renderEvidenceCards(folder) {
  let html = folder.items.slice(0, 4).map(item => buildEvidenceCard(item, folder.id, false)).join('');
  html += `<div class="evidence-card add-evidence" onclick="currentFolderId=${folder.id};openModal('addFileModal')">
    <div style="font-size:28px;">+</div>
    <div style="font-family:var(--mono);font-size:11px;font-weight:600;">ADD EVIDENCE</div>
  </div>`;
  return html;
}

function buildEvidenceCard(item, folderId, showDelete = true) {
  const tagHtml = item.tags.map(t => `<span class="evidence-tag ${t}">${t.toUpperCase()}</span>`).join('');
  const hasRealMedia = !!item.dataUrl;
  let thumbContent = '';
  if (item.type === 'image' && hasRealMedia) {
    thumbContent = `<img src="${item.dataUrl}" alt="${item.name}" style="width:100%;height:100%;object-fit:cover;">`;
  } else if (item.type === 'video') {
    thumbContent = `${hasRealMedia ? '' : '<div class="evidence-rec-badge">REC</div>'}<div class="evidence-play"><div class="evidence-play-btn">▶</div></div>`;
  } else if (item.type === 'image') {
    thumbContent = `<div class="evidence-hd-badge">HD CAPTURE</div><span style="font-size:36px;">${icons[item.type]}</span>`;
  } else {
    thumbContent = `<span style="font-size:36px;">${icons[item.type]||'📄'}</span>`;
  }
  return `
    <div class="evidence-card" onclick="viewFile(${folderId},${item.id})" style="cursor:pointer;">
      <div class="evidence-thumb" style="background:${thumbColors[item.type]||'#2a2a2a'};">${thumbContent}</div>
      <div class="evidence-info">
        <div class="evidence-filename">${item.name}</div>
        <div class="evidence-meta">TIMESTAMP: ${item.date} · ${item.size}</div>
        <div class="evidence-tags">${tagHtml}</div>
      </div>
    </div>`;
}

// ── FOLDER VIEW ──
window.openFolder = function(id) {
  currentFolderId = id; currentView = 'folder';
  renderFolderView(id);
};

function renderFolderView(id) {
  const folder = folders.find(f => f.id === id);
  if (!folder) { renderRootView(); return; }

  let itemsHtml = '';
  if (viewMode === 'grid') {
    itemsHtml = `<div class="evidence-grid">` +
      folder.items.map(item => buildEvidenceCard(item, id, true)).join('') +
      `<div class="evidence-card add-evidence" onclick="openModal('addFileModal')">
        <div style="font-size:28px;">+</div>
        <div style="font-family:var(--mono);font-size:11px;font-weight:600;">ADD FILE</div>
      </div></div>`;
  } else {
    itemsHtml = `<div class="file-list">` +
      folder.items.map(item => {
        const tagHtml = item.tags.map(t => `<span class="evidence-tag ${t}">${t.toUpperCase()}</span>`).join('');
        return `<div class="file-row" onclick="viewFile(${id},${item.id})">
          <span class="file-icon">${icons[item.type]||'📄'}</span>
          <span class="file-name">${item.name}</span>
          <div class="file-tags">${tagHtml}</div>
          <span class="file-size">${item.size}</span>
          <span class="file-date">${item.date}</span>
          <div onclick="event.stopPropagation();" style="display:flex;gap:6px;">
            <button class="file-action-btn" title="View" onclick="viewFile(${id},${item.id})">👁</button>
            <button class="file-action-btn" title="Delete" onclick="deleteFile(${id},${item.id})">✕</button>
          </div>
        </div>`;
      }).join('') +
      `</div>`;
  }

  main.innerHTML = `
    <div class="war-title-row">
      <div class="breadcrumb">
        <span class="breadcrumb-item" onclick="goRoot()">🔒 ROOT</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-item" onclick="goRoot()">ACTIVE DOSSIERS</span>
        <span class="breadcrumb-sep">›</span>
        <span class="breadcrumb-current">${folder.name.toUpperCase()}</span>
      </div>
      <div class="view-controls">
        <div class="view-toggle">
          <button class="view-toggle-btn ${viewMode==='grid'?'active':''}" onclick="setViewMode('grid')">⊞</button>
          <button class="view-toggle-btn ${viewMode==='list'?'active':''}" onclick="setViewMode('list')">☰</button>
        </div>
      </div>
    </div>
    <div class="folder-view-header">
      <div>
        <div class="folder-view-title">📁 ${folder.name}</div>
        <div class="folder-view-meta">${folder.items.length} FILES · ${folder.size} · <span style="text-transform:uppercase;">${folder.status}</span></div>
      </div>
      <div class="folder-actions">
        <button class="add-file-btn" onclick="openModal('addFileModal')">+ ADD FILE</button>
        <button class="filter-btn" onclick="toggleViewMode()">⊟ Toggle View</button>
        <button class="filter-btn" onclick="deleteFolder(${folder.id})" style="color:var(--hostile);border-color:var(--hostile);">🗑 Delete Folder</button>
      </div>
    </div>
    ${itemsHtml}
    <div class="upload-area" id="uploadDrop" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)" ondrop="handleDrop(event)" onclick="document.getElementById('fileInput').click()">
      <div class="upload-icon">⬆</div>
      <div class="upload-text">Drop files here or click to upload</div>
      <div class="upload-sub">Supports: MP4, JPG, PNG, WAV, PDF, CSV and more</div>
    </div>
    <input type="file" id="fileInput" style="display:none" multiple onchange="handleFileInput(event)">`;
}

window.goRoot = function() { currentView = 'root'; currentFolderId = null; renderRootView(); };
window.setViewMode = function(mode) { viewMode = mode; renderMain(); };
window.toggleViewMode = function() { viewMode = viewMode === 'grid' ? 'list' : 'grid'; renderMain(); };

// ── FILE VIEWER ──
window.viewFile = function(folderId, fileId) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const item = folder.items.find(i => i.id === fileId);
  if (!item) return;
  viewerCurrentItem = item;
  viewerCurrentFolderId = folderId;

  document.getElementById('fileViewerTitle').textContent = item.name;

  const content = document.getElementById('fileViewerContent');
  content.innerHTML = '';

  // Preview Section
  const preview = document.createElement('div');
  preview.className = 'file-viewer-preview';

  if (item.dataUrl) {
    if (item.type === 'image') {
      const img = document.createElement('img');
      img.src = item.dataUrl; img.alt = item.name;
      preview.appendChild(img);
    } else if (item.type === 'video') {
      const vid = document.createElement('video');
      vid.src = item.dataUrl; vid.controls = true; vid.style.maxWidth = '100%'; vid.style.maxHeight = '380px';
      preview.appendChild(vid);
    } else if (item.type === 'audio') {
      const aud = document.createElement('audio');
      aud.src = item.dataUrl; aud.controls = true; aud.style.width = '100%';
      preview.style.background = 'var(--bg2)'; preview.style.padding = '20px';
      preview.appendChild(aud);
    } else {
      // Document / Data — show icon + link
      const iconEl = document.createElement('div');
      iconEl.className = 'file-icon-large';
      iconEl.innerHTML = `<div style="font-size:64px;padding:40px;">${icons[item.type]||'📄'}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding-bottom:20px;">File uploaded – no visual preview available</div>
        <a href="${item.dataUrl}" download="${item.name}" style="font-family:var(--mono);font-size:12px;color:var(--accent);text-decoration:underline;">⬇ Download ${item.name}</a>`;
      preview.style.background = 'var(--bg2)'; preview.style.flexDirection = 'column';
      preview.appendChild(iconEl);
    }
  } else {
    // Placeholder (no real file uploaded)
    const ph = document.createElement('div');
    ph.className = 'file-icon-large';
    ph.innerHTML = `<div style="font-size:64px;">${icons[item.type]||'📄'}</div>
      <div style="font-family:var(--mono);font-size:11px;color:var(--text3);padding:20px;text-align:center;">No file data available.<br>This is a demo entry. Upload a real file to preview it.</div>`;
    preview.style.background = 'var(--bg2)'; preview.style.flexDirection = 'column';
    preview.appendChild(ph);
  }
  content.appendChild(preview);

  // Meta grid
  const metaGrid = document.createElement('div');
  metaGrid.className = 'file-viewer-meta';
  metaGrid.innerHTML = `
    <div class="file-viewer-meta-item"><div class="file-viewer-meta-label">FILE NAME</div><div class="file-viewer-meta-value">${item.name}</div></div>
    <div class="file-viewer-meta-item"><div class="file-viewer-meta-label">TYPE</div><div class="file-viewer-meta-value">${item.type.toUpperCase()}</div></div>
    <div class="file-viewer-meta-item"><div class="file-viewer-meta-label">SIZE</div><div class="file-viewer-meta-value">${item.size}</div></div>
    <div class="file-viewer-meta-item"><div class="file-viewer-meta-label">TIMESTAMP</div><div class="file-viewer-meta-value">${item.date}</div></div>
    <div class="file-viewer-meta-item"><div class="file-viewer-meta-label">TAGS</div><div class="file-viewer-meta-value">${item.tags.join(', ') || '—'}</div></div>
  `;
  content.appendChild(metaGrid);

  // Notes
  const notesLabel = document.createElement('div');
  notesLabel.className = 'file-viewer-meta-label';
  notesLabel.style.width = '100%';
  notesLabel.textContent = 'NOTES (editable)';
  content.appendChild(notesLabel);
  const notesArea = document.createElement('textarea');
  notesArea.className = 'notes-edit-area';
  notesArea.rows = 3;
  notesArea.value = item.notes || '';
  notesArea.id = 'viewerNotesArea';
  content.appendChild(notesArea);

  // Download button wiring
  document.getElementById('fileViewerDownload').onclick = () => {
    if (item.dataUrl) {
      const a = document.createElement('a'); a.href = item.dataUrl; a.download = item.name; a.click();
    } else { showToast('No file data to download (demo entry)', 'error'); }
  };

  openModal('fileViewerModal');
};

document.getElementById('closeFileViewer').addEventListener('click', () => closeModal('fileViewerModal'));
document.getElementById('cancelFileViewer').addEventListener('click', () => closeModal('fileViewerModal'));
document.getElementById('saveFileNotes').addEventListener('click', () => {
  if (viewerCurrentItem) {
    viewerCurrentItem.notes = document.getElementById('viewerNotesArea').value;
    saveData();
    showToast('Notes saved', 'success');
  }
});

// ── FILE MANAGEMENT ──
window.deleteFile = function(folderId, fileId) {
  const folder = folders.find(f => f.id === folderId);
  if (folder) { folder.items = folder.items.filter(i => i.id !== fileId); saveData(); renderFolderView(folderId); showToast('File removed'); }
};

window.deleteFolder = function(folderId) {
  if (!confirm('Delete this folder and all its contents?')) return;
  folders = folders.filter(f => f.id !== folderId);
  saveData(); goRoot(); showToast('Folder deleted');
};

// ── DRAG & DROP ──
window.handleDragOver = function(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); };
window.handleDragLeave = function(e) { e.currentTarget.classList.remove('drag-over'); };
window.handleDrop = function(e) {
  e.preventDefault(); e.currentTarget.classList.remove('drag-over');
  const files = [...e.dataTransfer.files];
  processUploadedFiles(files);
};
window.handleFileInput = function(e) {
  processUploadedFiles([...e.target.files]); e.target.value = '';
};

function processUploadedFiles(files) {
  if (!currentFolderId) { showToast('Please open a folder first', 'error'); return; }
  let count = 0;
  files.forEach(file => {
    const ftype = getFileType(file.type);
    const reader = new FileReader();
    reader.onload = ev => {
      addFileToFolder(currentFolderId, file.name, ftype, formatSize(file.size), [], '', ev.target.result);
      count++;
      if (count === files.length) {
        showToast(`${files.length} file(s) uploaded`, 'success');
        renderFolderView(currentFolderId);
      }
    };
    reader.readAsDataURL(file);
  });
}

function addFileToFolder(folderId, name, type, size, tags, notes = '', dataUrl = '') {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  folder.items.unshift({ id: nextFileId++, name, type, size, date: 'JUST NOW', tags, notes, dataUrl });
  saveData();
}

function getFileType(mimeType) {
  if (!mimeType) return 'document';
  if (mimeType.startsWith('video')) return 'video';
  if (mimeType.startsWith('image')) return 'image';
  if (mimeType.startsWith('audio')) return 'audio';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('text')) return 'document';
  if (mimeType.includes('csv') || mimeType.includes('json') || mimeType.includes('xml')) return 'data';
  return 'document';
}

function formatSize(bytes) {
  if (bytes > 1e9) return (bytes / 1e9).toFixed(1) + ' GB';
  if (bytes > 1e6) return (bytes / 1e6).toFixed(1) + ' MB';
  return (bytes / 1e3).toFixed(0) + ' KB';
}

// ── MODALS ──
function openModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// Add Folder
document.getElementById('closeAddFolder').addEventListener('click', () => closeModal('addFolderModal'));
document.getElementById('cancelAddFolder').addEventListener('click', () => closeModal('addFolderModal'));
document.getElementById('confirmAddFolder').addEventListener('click', () => {
  const name = document.getElementById('newFolderName').value.trim();
  if (!name) { showToast('Folder name required', 'error'); return; }
  const status = document.getElementById('newFolderStatus').value;
  folders.push({ id: nextFolderId++, name, status, size: '0 MB', items: [] });
  document.getElementById('newFolderName').value = '';
  document.getElementById('newFolderFiles').value = '';
  saveData(); closeModal('addFolderModal'); renderMain();
  showToast('Folder created', 'success');
});

// Add File
document.getElementById('closeAddFile').addEventListener('click', () => closeModal('addFileModal'));
document.getElementById('cancelAddFile').addEventListener('click', () => closeModal('addFileModal'));
document.getElementById('confirmAddFile').addEventListener('click', () => {
  const name = document.getElementById('newFileName').value.trim();
  if (!name) { showToast('File name required', 'error'); return; }
  const type = document.getElementById('newFileType').value;
  const size = document.getElementById('newFileSize').value.trim() || '0 MB';
  const tagsRaw = document.getElementById('newFileTags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(Boolean) : [];
  const notes = document.getElementById('newFileNotes').value.trim();
  if (currentFolderId) { addFileToFolder(currentFolderId, name, type, size, tags, notes); renderFolderView(currentFolderId); }
  document.getElementById('newFileName').value = '';
  document.getElementById('newFileSize').value = '';
  document.getElementById('newFileTags').value = '';
  document.getElementById('newFileNotes').value = '';
  closeModal('addFileModal');
  showToast('File added', 'success');
});

// New Submission
document.getElementById('newSubmissionBtn').addEventListener('click', () => {
  const subFolder = document.getElementById('subFolder');
  subFolder.innerHTML = folders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
  openModal('newSubmissionModal');
});
document.getElementById('closeSubmission').addEventListener('click', () => closeModal('newSubmissionModal'));
document.getElementById('cancelSubmission').addEventListener('click', () => closeModal('newSubmissionModal'));
document.getElementById('confirmSubmission').addEventListener('click', () => {
  const title = document.getElementById('subTitle').value.trim();
  if (!title) { showToast('Title required', 'error'); return; }
  const folderId = parseInt(document.getElementById('subFolder').value);
  const desc = document.getElementById('subDesc').value.trim();
  const cls = document.getElementById('subClass').value;
  addFileToFolder(folderId, title + '.submission', 'document', '< 1 MB', [cls.toLowerCase()], desc);
  document.getElementById('subTitle').value = '';
  document.getElementById('subDesc').value = '';
  closeModal('newSubmissionModal');
  showToast('Submission received', 'success');
  renderMain();
});

// Global Search
document.getElementById('globalSearch').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase();
  if (!q) { renderMain(); return; }
  main.querySelectorAll('.folder-card:not(.add-folder), .evidence-card:not(.add-evidence), .file-row').forEach(el => {
    el.style.opacity = el.textContent.toLowerCase().includes(q) ? '1' : '0.25';
  });
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.add('hidden'); });
});

// ── INIT ──
renderMain();
