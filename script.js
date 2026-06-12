/**
 * 勤務地検索ツール - script.js
 * サーバー不要・API不要・完全静的
 */

let allCompanies = [];
let filtered = [];

const PREFECTURES = [
  '北海道','青森県','岩手県','宮城県','秋田県','山形県','福島県',
  '茨城県','栃木県','群馬県','埼玉県','千葉県','東京都','神奈川県',
  '新潟県','富山県','石川県','福井県','山梨県','長野県','岐阜県',
  '静岡県','愛知県','三重県','滋賀県','京都府','大阪府','兵庫県',
  '奈良県','和歌山県','鳥取県','島根県','岡山県','広島県','山口県',
  '徳島県','香川県','愛媛県','高知県','福岡県','佐賀県','長崎県',
  '熊本県','大分県','宮崎県','鹿児島県','沖縄県'
];

document.addEventListener('DOMContentLoaded', () => {
  buildPrefectureSelect();
  loadCompanies();
  initTabs();
});

function buildPrefectureSelect() {
  const sel = document.getElementById('s_prefecture');
  PREFECTURES.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = p;
    sel.appendChild(opt);
  });
}

async function loadCompanies() {
  try {
    const res = await fetch('./companies.json');
    allCompanies = await res.json();
    search();
    updateStatus(`企業データ ${allCompanies.length}件 読み込み完了`);
  } catch (e) {
    document.getElementById('results').innerHTML = `<div class="empty-state"><div class="icon">⚠️</div><div>companies.json の読み込みに失敗しました</div></div>`;
  }
}

function search() {
  const jobType = document.getElementById('s_jobType').value;
  const prefecture = document.getElementById('s_prefecture').value;
  const businessTrip = document.getElementById('s_businessTrip').value;
  const relocation = document.getElementById('s_relocation').value;

  filtered = allCompanies.filter(c => {
    if (jobType && !c.jobType.includes(jobType)) return false;
    if (prefecture && c.prefecture !== prefecture) return false;
    if (businessTrip === 'false' && c.businessTrip) return false;
    if (relocation === 'false' && c.relocation) return false;
    return true;
  });

  // 夜勤フィルター：エンジニアのみ表示
  const nightShift = document.getElementById('s_nightShift').value;
  if (nightShift === 'false' && jobType === 'エンジニア') {
    filtered = filtered.filter(c => !c.nightShift);
  }

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

// 推薦ステータスの判定
function getRecommendStatus(c) {
  if (c.mustRelocate) {
    return { label: '転居必須', cls: 'status-relocate', icon: '🏠', detail: '転居が必要です' };
  }
  if (c.commuteType === 'commute_only') {
    return { label: '通勤可', cls: 'status-ok', icon: '✅', detail: `${c.commuteBase}まで${c.commuteMinutes}分圏内` };
  }
  if (c.commuteType === 'business_trip_ok') {
    return { label: '出張可能なら推薦可', cls: 'status-trip', icon: '🚗', detail: `通勤限定不可・出張対応可` };
  }
  if (c.commuteType === 'must_relocate') {
    return { label: '転居必須', cls: 'status-relocate', icon: '🏠', detail: '転居が必要です' };
  }
  return { label: '要確認', cls: 'status-check', icon: '❓', detail: '条件を確認してください' };
}

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
  container.innerHTML = filtered.map((c, i) => renderCard(c, i + 1)).join('');
}

function renderCard(c, index) {
  const status = getRecommendStatus(c);
  const jobTypeTags = c.jobType.map(j => `<span class="tag tag-jobtype">${j}</span>`).join('');
  const salaryLabel = `${c.salaryMin}〜${c.salaryMax}万円`;

  const condTags = [
    c.businessTrip ? `<span class="tag tag-warn">出張あり</span>` : `<span class="tag tag-ok">出張なし</span>`,
    c.relocation ? `<span class="tag tag-warn">転勤あり</span>` : `<span class="tag tag-ok">転勤なし</span>`,
    c.mustRelocate ? `<span class="tag tag-ng">転居必須</span>` : `<span class="tag tag-ok">転居不要</span>`,
    c.nightShift ? `<span class="tag tag-warn">夜勤あり</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="company-card">
      <div class="card-top">
        <div class="card-index">${index}</div>
        <div class="card-main">
          <div class="card-header-row">
            <div class="company-name">${escHtml(c.name)}</div>
            <div class="salary-badge">💴 ${salaryLabel}</div>
          </div>
          <div class="company-sub">
            <span>📍 ${escHtml(c.location)}</span>
            <span>🚉 ${escHtml(c.nearestStation)}</span>
          </div>
        </div>
      </div>

      <div class="status-banner ${status.cls}">
        <span class="status-icon">${status.icon}</span>
        <div class="status-body">
          <div class="status-label">${status.label}</div>
          <div class="status-detail">${status.detail}</div>
        </div>
        <div class="commute-time">
          ${c.commuteBase}まで<br><strong>${c.commuteMinutes}分</strong>圏内
        </div>
      </div>

      <div class="card-tags">
        ${jobTypeTags}
        ${condTags}
      </div>

      ${c.memo ? `<div class="card-memo">📝 ${escHtml(c.memo)}</div>` : ''}
    </div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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

function updateStatus(msg) {
  const el = document.getElementById('statusBar');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display = 'none', 3000);
}

// 企業追加JSONジェネレーター
function generateJSON() {
  const getVal = id => document.getElementById(id)?.value?.trim() || '';
  const getInt = id => parseInt(document.getElementById(id)?.value) || 0;
  const getChk = id => document.getElementById(id)?.checked || false;
  const getMulti = name => Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(el => el.value);

  const company = {
    id: Date.now(),
    name: getVal('f_name'),
    jobType: getMulti('f_jobType'),
    prefecture: getVal('f_prefecture'),
    location: getVal('f_location'),
    area: getVal('f_area'),
    nearestStation: getVal('f_station'),
    commuteBase: getVal('f_commuteBase'),
    commuteMinutes: getInt('f_commuteMinutes'),
    commuteType: getVal('f_commuteType'),
    businessTrip: getChk('f_businessTrip'),
    relocation: getChk('f_relocation'),
    mustRelocate: getChk('f_mustRelocate'),
    nightShift: getChk('f_nightShift'),
    salaryMin: getInt('f_salaryMin'),
    salaryMax: getInt('f_salaryMax'),
    memo: getVal('f_memo')
  };

  if (!company.name) { alert('企業名を入力してください'); return; }

  const json = JSON.stringify(company, null, 2);
  document.getElementById('jsonOutput').textContent = json;
  document.getElementById('jsonOutputArea').style.display = 'block';
}

function copyJSON() {
  const text = document.getElementById('jsonOutput').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const btn = document.querySelector('.copy-btn');
    btn.textContent = 'コピーしました！';
    setTimeout(() => btn.textContent = 'JSONをコピー', 2000);
  });
}
