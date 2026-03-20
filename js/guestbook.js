import sb from './supabase.js';

// ===== 팝업 열기/닫기 =====
const overlay = document.getElementById('gb-overlay');

document.getElementById('nav-guestbook-btn').addEventListener('click', (e) => {
  e.preventDefault();
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  loadEntries();
});

document.getElementById('gb-close').addEventListener('click', close);
overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay.classList.contains('active')) close();
});

function close() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ===== 날짜 포맷 =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// ===== XSS 방어 =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 목록 불러오기 =====
async function loadEntries() {
  const list = document.getElementById('gb-list');
  list.innerHTML = '<p class="gb-loading">불러오는 중...</p>';

  const { data, error } = await sb
    .from('guestbook')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    list.innerHTML = '<p class="gb-loading">불러오지 못했습니다.</p>';
    return;
  }

  if (!data || data.length === 0) {
    list.innerHTML = '<p class="gb-loading">아직 방명록이 비어있어요. 첫 번째로 남겨보세요!</p>';
    return;
  }

  list.innerHTML = data.map(entry => `
    <div class="gb-entry">
      <div class="gb-entry-top">
        <span class="gb-entry-name">${escapeHtml(entry.nickname)}</span>
        <span class="gb-entry-date">${formatDate(entry.created_at)}</span>
      </div>
      <p class="gb-entry-msg">${escapeHtml(entry.message)}</p>
    </div>
  `).join('');
}

// ===== 글 등록 =====
document.getElementById('gb-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('gb-nickname').value.trim();
  const message  = document.getElementById('gb-message').value.trim();
  const msg      = document.getElementById('gb-msg');
  const btn      = document.getElementById('gb-submit-btn');

  if (!nickname || !message) return;

  btn.disabled    = true;
  btn.textContent = '저장 중...';

  const { error } = await sb.from('guestbook').insert({ nickname, message });

  if (error) {
    msg.textContent = '저장에 실패했습니다. 다시 시도해주세요.';
    msg.className   = 'msg error';
  } else {
    document.getElementById('gb-nickname').value = '';
    document.getElementById('gb-message').value  = '';
    msg.textContent = '방명록을 남겼습니다!';
    msg.className   = 'msg success';
    setTimeout(() => { msg.textContent = ''; }, 2000);
    loadEntries();
  }

  btn.disabled    = false;
  btn.textContent = '남기기';
});
