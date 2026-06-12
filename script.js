/**
 * 求人検索ツール - script.js
 * サーバー不要・API不要・完全静的
 * 企業データはcompanies.jsonで管理（コード修正不要）
 */

// ===== 状態管理 =====
let allCompanies = [];
let filtered = [];

// ===== 初期化 =====
document.addEventListener('DOMContentLoaded', () => {
  loadCompanies();
  initTabs();
});

async function loadCompanies() {
  try {
    const res = await fetch('./companies.json');
    allCompanies = await res.json();
    search();
    updateStatus(`企業データ ${allCompanies.length}件 読み込み完了`);
  } catch (e) {
    showStatus('companies.json の読み込みに失敗しました。ファイルが同じフォルダにあるか確認してください。', 'error');
  }
}

// ===== 検索 =====
function search() {
  const jobType = document.getElementById('s_jobType').value;
  const area = document.getElementById('s_area').value.trim();
  const carCommute = document.getElementById('s_carCommute').value;
  const businessTrip = document.getElementById('s_businessTrip').value;
  const relocation = document.getElementById('s_relocation').value;
  const mustRelocate = document.getElementById('s_mustRelocate').value;
  const nightShift = document.getElementById('s_nightShift').value;
  const salaryMin = parseInt(document.getElementById('s_salaryMin').value) || 0;

  filtered = allCompanies.filter(c => {
    if (jobType && !c.jobType.includes(jobType)) return false;
    if (area && !c.area.includes(area) && !c.location.includes(area)) return false;
    if (carCommute === 'true' && !c.carCommute) return false;
    if (businessTrip === 'false' && c.businessTrip) return false;
    if (relocation === 'false' && c.relocation) return false;
    if (mustRelocate === 'false' && c.mustRelocate) return false;
    if (nightShift === 'false' && c.nightShift) return false;
    if (salaryMin > 0 && c.salaryMax < salaryMin) return false;
    return true;
  });

  sortResults();
  renderResults();
  updateCount();
}

function sortResults() {
  const sort = document.getElementById('s_sort')?.value || 'default';
  if (sort === 'salaryDesc') filtered.sort((a, b) => b.salaryMax - a.salaryMax);
  else if (sort === 'salaryAsc') filtered.sort((a, b) => a.salaryMin - b.salaryMin);
  else filtered.sort((a, b) => a.id - b.id);
}

function resetSearch() {
  document.getElementById('searchForm').reset();
  search();
}

function updateCount() {
  const el = document.getElementById('resultCount');
  if (el) el.textContent = `${filtered.length} / ${allCompanies.length} 件`;
}

// ===== 描画 =====
function renderResults() {
  const container = document.getElementById('results');
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon">🔍</div>
        <div>条件に一致する企業がありません</div>
        <div style="font-size:12px;margin-top:6px">検索条件を変更してみてください</div>
      </div>`;
    return;
  }
  container.innerHTML = filtered.map(c => renderCard(c)).join('');
}

function renderCard(c) {
  const salaryLabel = `${c.salaryMin}〜${c.salaryMax}万円`;
  const jobTypeTags = c.jobType.map(j => `<span class="tag tag-jobtype">${j}</span>`).join('');

  const tags = [
    { label: `出張：${c.businessTrip ? 'あり' : 'なし'}`, cls: c.businessTrip ? 'tag-warn' : 'tag-ok' },
    { label: `転勤：${c.relocation ? 'あり' : 'なし'}`, cls: c.relocation ? 'tag-warn' : 'tag-ok' },
    { label: `転居：${c.mustRelocate ? '必須' : '不要'}`, cls: c.mustRelocate ? 'tag-ng' : 'tag-ok' },
    { label: `車通勤：${c.carCommute ? '可' : '不可'}`, cls: c.carCommute ? 'tag-ok' : 'tag-neutral' },
    { label: `夜勤：${c.nightShift ? 'あり' : 'なし'}`, cls: c.nightShift ? 'tag-warn' : 'tag-ok' },
    { label: `直行直帰：${c.flexibleWork ? '可' : '不可'}`, cls: c.flexibleWork ? 'tag-info' : 'tag-neutral' },
  ].map(t => `<span class="tag ${t.cls}">${t.label}</span>`).join('');

  return `
    <div class="company-card">
      <div class="card-header">
        <div class="card-title">
          <div class="company-name">${escHtml(c.name)}</div>
          <div class="company-location">📍 ${escHtml(c.location)}（${escHtml(c.area)}）</div>
        </div>
        <div class="salary-badge">💴 ${salaryLabel}</div>
      </div>
      <div class="card-tags">
        ${jobTypeTags}
        ${tags}
      </div>
      <div class="card-station">🚉 ${escHtml(c.nearestStation)}</div>
      ${c.memo ? `<div class="card-memo" style="margin-top:10px">📝 ${escHtml(c.memo)}</div>` : ''}
    </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== タブ =====
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(btn.dataset.tab).classList.add('active');
    });
  });
}

// ===== ステータス =====
function updateStatus(msg) {
  const el = document.getElementById('statusBar');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

function showStatus(msg, type) {
  const el = document.getElementById('statusBar');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

// ===== 企業追加（JSONジェネレーター） =====
function generateJSON() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';
  const getInt = id => parseInt(document.getElementById(id)?.value) || 0;
  const getChk = id => document.getElementById(id)?.checked || false;
  const getMulti = name => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);

  const company = {
    id: Date.now(),
    name: getVal('f_name'),
    jobType: getMulti('f_jobType'),
    location: getVal('f_location'),
    area: getVal('f_area'),
    nearestStation: getVal('f_station'),
    carCommute: getChk('f_carCommute'),
    businessTrip: getChk('f_businessTrip'),
    relocation: getChk('f_relocation'),
    mustRelocate: getChk('f_mustRelocate'),
    flexibleWork: getChk('f_flexibleWork'),
    nightShift: getChk('f_nightShift'),
    salaryMin: getInt('f_salaryMin'),
    salaryMax: getInt('f_salaryMax'),
    memo: getVal('f_memo')
  };

  if (!company.name) { alert('企業名を入力してください'); return; }

  const json = JSON.stringify(company, null, 2);
  document.getElementById('jsonOutput').textContent = json;
  document.getElementById('jsonOutputArea').style.display = 'block';
  document.getElementById('addInstruction').style.display = 'block';
}

function copyJSON() {
  const text = document.getElementById('jsonOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'コピーしました！';
    setTimeout(() => btn.textContent = 'JSONをコピー', 2000);
  });
}
