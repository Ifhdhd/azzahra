
// Keep secret in-memory only when used
let DATABASE_URL = '';
let DATABASE_SECRET = '';
let allData = [];
let editIndex = null;

function focusConfig(){ document.getElementById('dbUrl').focus(); }

function saveConfig(){
  DATABASE_URL = document.getElementById('dbUrl').value.trim();
  // do NOT save secret to localStorage
  DATABASE_SECRET = document.getElementById('dbSecret').value.trim();
  if(DATABASE_URL) localStorage.setItem('dbUrl', DATABASE_URL);
  alert('URL disimpan. Secret tidak disimpan.');
}

function clearConfig(){
  document.getElementById('dbUrl').value = '';
  document.getElementById('dbSecret').value = '';
  DATABASE_URL = '';
  DATABASE_SECRET = '';
  localStorage.removeItem('dbUrl');
  renderData();
}

function loadData(){
  // read URL from input only (do not default to storage silently)
  const url = document.getElementById('dbUrl').value.trim();
  const secret = document.getElementById('dbSecret').value.trim();
  if(!url){ alert('Isi Database URL!'); return; }

  fetch(url + '.json?auth=' + secret)
    .then(r => r.json())
    .then(data => {
      allData = [];
      if(!data){ renderData(); return; }
      Object.keys(data).forEach(k => { if(typeof data[k] === 'object') allData.push({ nodeKey:k, ...data[k] }); });
      renderData();
    }).catch(e => { alert('Gagal memuat data. Cek URL/SECRET.'); });
}

function renderData(){
  const tbody = document.getElementById('dataBody');
  const search = (document.getElementById('search')?.value || '').toLowerCase();
  tbody.innerHTML = '';
  const filtered = allData.filter(item => {
    return !search || (item['Device Id'] && item['Device Id'].toLowerCase().includes(search)) ||
      (item.username && item.username.toLowerCase().includes(search));
  });
  filtered.forEach((item, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="checkbox" class="ck" data-key="${item.nodeKey}"></td>
      <td>${idx}</td>
      <td>${item['Device Id'] || '(kosong)'}</td>
      <td>${item.username || '(kosong)'}</td>
      <td>${item.password || '(kosong)'}</td>
      <td>${item.expiry || '(kosong)'}</td>
      <td>
        <button class="btn ghost" onclick="editUser('${item.nodeKey}')">Edit</button>
        <button class="btn danger" onclick="delUser('${item.nodeKey}')">Hapus</button>
      </td>`;
    tbody.appendChild(tr);
  });
  document.getElementById('totalCount').textContent = filtered.length;
  document.getElementById('userCount').textContent = 'Users: ' + allData.length;
  document.getElementById('checkAll').checked = false;
}

function toggleAll(source){
  document.querySelectorAll('.ck').forEach(c => c.checked = source.checked);
}

function getSelectedKeys(){
  return Array.from(document.querySelectorAll('.ck:checked')).map(c => c.dataset.key);
}

// Edit single user
function editUser(key){
  const item = allData.find(d => d.nodeKey == key);
  if(!item) return;
  editIndex = key;
  document.getElementById('modal').classList.add('show');
  document.getElementById('device_id').value = item['Device Id'] || '';
  document.getElementById('username').value = item.username || '';
  document.getElementById('password').value = item.password || '';
  document.getElementById('expiry').value = item.expiry || '';
  document.getElementById('modalTitle').innerText = 'Edit User';
}

function closeModal(){ document.getElementById('modal').classList.remove('show'); editIndex = null; }

function saveUser(){
  const url = document.getElementById('dbUrl').value.trim();
  const secret = document.getElementById('dbSecret').value.trim();
  if(!url){ alert('Isi Database URL!'); return; }
  const obj = {
    'Device Id': document.getElementById('device_id').value.trim(),
    username: document.getElementById('username').value.trim(),
    password: document.getElementById('password').value.trim(),
    expiry: document.getElementById('expiry').value.trim()
  };
  if(editIndex !== null){
    fetch(`${url}/${editIndex}.json?auth=${secret}`, { method:'PUT', body:JSON.stringify(obj) }).then(()=>{ closeModal(); loadData(); });
  } else {
    const newIndex = allData.length > 0 ? Math.max(...allData.map(d=>parseInt(d.nodeKey)))+1 : 0;
    fetch(`${url}/${newIndex}.json?auth=${secret}`, { method:'PUT', body:JSON.stringify(obj) }).then(()=>{ closeModal(); loadData(); });
  }
}

// Multi-edit
function openMultiEdit(){
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Pilih data!'); return; }
  document.getElementById('multiModal').classList.add('show');
}
function closeMulti(){ document.getElementById('multiModal').classList.remove('show'); }
function applyMultiEdit(){
  const url = document.getElementById('dbUrl').value.trim();
  const secret = document.getElementById('dbSecret').value.trim();
  const u = document.getElementById('multi_username').value.trim();
  const p = document.getElementById('multi_password').value.trim();
  const e = document.getElementById('multi_expiry').value.trim();
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Tidak ada data dipilih'); return; }
  keys.forEach(k => {
    const update = {};
    if(u) update.username = u;
    if(p) update.password = p;
    if(e) update.expiry = e;
    fetch(`${url}/${k}.json?auth=${secret}`, { method:'PATCH', body:JSON.stringify(update) });
  });
  alert('Edit massal selesai');
  closeMulti();
  loadData();
}

// Multi-delete
function deleteSelected(){
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Tidak ada data dipilih'); return; }
  if(!confirm(`Hapus ${keys.length} data?`)) return;
  const url = document.getElementById('dbUrl').value.trim();
  const secret = document.getElementById('dbSecret').value.trim();
  keys.forEach(k => {
    fetch(`${url}/${k}.json?auth=${secret}`, { method: 'DELETE' });
  });
  alert('Hapus selesai');
  loadData();
}

// Delete single
function delUser(k){
  const url = document.getElementById('dbUrl').value.trim();
  const secret = document.getElementById('dbSecret').value.trim();
  if(!confirm('Hapus data ini?')) return;
  fetch(`${url}/${k}.json?auth=${secret}`, { method: 'DELETE' }).then(()=> loadData());
}

// Export selected keys to JSON file
function exportSelected(){
  const keys = getSelectedKeys();
  if(keys.length === 0){ alert('Pilih data untuk export'); return; }
  const exportObj = {};
  keys.forEach(k => {
    const item = allData.find(d => d.nodeKey == k);
    if(item) exportObj[k] = item;
  });
  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'export-selected.json'; document.body.appendChild(a); a.click(); a.remove();
}

// drawer toggle for mobile
function toggleDrawer(){
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('drawerOverlay');
  if(window.getComputedStyle(sb).display === 'none'){ // mobile: show overlay + sidebar as fixed
    sb.style.display = 'block'; sb.style.position = 'fixed'; sb.style.zIndex = 3000; sb.style.left = '0'; overlay.classList.add('show');
  } else {
    if(overlay.classList.contains('show')){ sb.style.display='none'; overlay.classList.remove('show'); }
  }
}

// utilities
function renderData(){ /* placeholder if called without load */ }
