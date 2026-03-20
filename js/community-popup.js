import sb from './supabase.js';

// ===== 상태 =====
let currentUser = null;
let currentPost = null;
let isEditMode  = false;
let currentPage = 1;
const PAGE_SIZE = 10;

// ===== 팝업 열기/닫기 =====
const overlay = document.getElementById('community-overlay');

document.getElementById('nav-community-btn').addEventListener('click', (e) => {
  e.preventDefault();
  openCommunity();
});

document.getElementById('community-close').addEventListener('click', closeCommunity);
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeCommunity();
});

function openCommunity() {
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  showView('cp-view-list');
  loadPosts(1);
}

function closeCommunity() {
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

// ESC 키로 닫기
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay.classList.contains('active')) closeCommunity();
});

// ===== 뷰 전환 =====
function showView(viewId) {
  ['cp-view-list', 'cp-view-write', 'cp-view-detail'].forEach(id => {
    document.getElementById(id).style.display = id === viewId ? 'block' : 'none';
  });
}

// ===== 유틸 =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function maskEmail(email) {
  const [id, domain] = email.split('@');
  if (id.length <= 2) return `${id[0]}*@${domain}`;
  return `${id.slice(0, 2)}${'*'.repeat(Math.min(id.length - 2, 4))}@${domain}`;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 글 목록 =====
async function loadPosts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('cp-post-list');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">불러오는 중...</td></tr>';

  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  const { data, error, count } = await sb
    .from('posts')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">글을 불러오지 못했습니다.</td></tr>';
    return;
  }

  if (!data || data.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">아직 게시글이 없습니다. 첫 글을 작성해보세요!</td></tr>';
    renderPagination(0);
    return;
  }

  tbody.innerHTML = data.map((post, idx) => {
    const num = count - from - idx;
    return `
      <tr data-id="${post.id}">
        <td class="col-num">${num}</td>
        <td><span class="post-title-link">${escapeHtml(post.title)}</span></td>
        <td class="col-author">${maskEmail(post.user_email)}</td>
        <td><span class="date-text">${formatDate(post.created_at)}</span></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openPost(row.dataset.id));
  });

  renderPagination(count);
}

// ===== 페이지네이션 =====
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const container  = document.getElementById('cp-pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = Array.from({ length: totalPages }, (_, i) => {
    const p = i + 1;
    return `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }).join('');

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPosts(Number(btn.dataset.page)));
  });
}

// ===== 글 상세 =====
async function openPost(postId) {
  const { data, error } = await sb.from('posts').select('*').eq('id', postId).single();
  if (error || !data) { alert('글을 불러올 수 없습니다.'); return; }

  currentPost = data;

  document.getElementById('cp-detail-title').textContent   = data.title;
  document.getElementById('cp-detail-author').textContent  = `작성자: ${maskEmail(data.user_email)}`;
  document.getElementById('cp-detail-date').textContent    = formatDate(data.created_at);
  document.getElementById('cp-detail-content').textContent = data.content;

  const actions = document.getElementById('cp-detail-actions');
  actions.style.display = (currentUser && currentUser.id === data.user_id) ? 'flex' : 'none';

  showView('cp-view-detail');
}

// ===== 글쓰기 =====
document.getElementById('cp-btn-write').addEventListener('click', () => {
  if (!currentUser) {
    closeCommunity();
    document.getElementById('nav-login-btn').click();
    return;
  }
  isEditMode = false;
  currentPost = null;
  document.getElementById('cp-write-heading').textContent = '글쓰기';
  document.getElementById('cp-btn-submit').textContent    = '등록하기';
  document.getElementById('cp-input-title').value   = '';
  document.getElementById('cp-input-content').value = '';
  showView('cp-view-write');
});

document.getElementById('cp-cancel-write').addEventListener('click', () => showView('cp-view-list'));

document.getElementById('cp-btn-back').addEventListener('click', () => {
  showView('cp-view-list');
  loadPosts(currentPage);
});

// ===== 폼 제출 =====
document.getElementById('cp-form-write').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title   = document.getElementById('cp-input-title').value.trim();
  const content = document.getElementById('cp-input-content').value.trim();
  const btn     = document.getElementById('cp-btn-submit');

  if (!title || !content) return;
  btn.disabled     = true;
  btn.textContent  = isEditMode ? '수정 중...' : '등록 중...';

  if (isEditMode && currentPost) {
    const { error } = await sb.from('posts').update({ title, content }).eq('id', currentPost.id);
    if (error) { alert('수정에 실패했습니다.'); }
    else { await openPost(currentPost.id); }
  } else {
    const { error } = await sb.from('posts').insert({
      title,
      content,
      user_id:    currentUser.id,
      user_email: currentUser.email,
    });
    if (error) { alert('등록에 실패했습니다.'); }
    else { showView('cp-view-list'); loadPosts(1); }
  }

  btn.disabled    = false;
  btn.textContent = isEditMode ? '수정하기' : '등록하기';
});

// ===== 수정/삭제 =====
document.getElementById('cp-btn-edit').addEventListener('click', () => {
  if (!currentPost) return;
  isEditMode = true;
  document.getElementById('cp-write-heading').textContent = '글 수정';
  document.getElementById('cp-btn-submit').textContent    = '수정하기';
  document.getElementById('cp-input-title').value   = currentPost.title;
  document.getElementById('cp-input-content').value = currentPost.content;
  showView('cp-view-write');
});

document.getElementById('cp-btn-delete').addEventListener('click', async () => {
  if (!currentPost || !confirm('정말 삭제하시겠습니까?')) return;
  const { error } = await sb.from('posts').delete().eq('id', currentPost.id);
  if (error) { alert('삭제에 실패했습니다.'); }
  else { currentPost = null; showView('cp-view-list'); loadPosts(currentPage); }
});

// ===== 초기화 =====
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user ?? null;

  // 로그인 상태 변화 감지 (main.js 로그인 후 반영)
  sb.auth.onAuthStateChange((_event, session) => {
    currentUser = session?.user ?? null;
  });
}

init();
