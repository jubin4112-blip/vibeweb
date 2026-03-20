import sb from './supabase.js';

// ===== 상태 =====
let currentUser    = null;
let currentPost    = null;
let isEditMode     = false;
let currentPage    = 1;
let activeCategory = '';
const PAGE_SIZE    = 15;

// ===== 뷰 전환 =====
function showView(id) {
  ['view-list', 'view-write', 'view-detail'].forEach(v => {
    document.getElementById(v).style.display = v === id ? 'block' : 'none';
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== 유틸 =====
function formatDate(str) {
  const d = new Date(str);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

function maskEmail(email) {
  return email.split('@')[0];
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 목록 =====
async function loadPosts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('post-list');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">불러오는 중...</td></tr>';

  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let posts, totalCount;

  if (activeCategory === '') {
    // 전체: free_posts + community_posts 합산
    const fetchLimit = to + 1;
    const [freeRes, commRes] = await Promise.all([
      sb.from('free_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(0, fetchLimit),
      sb.from('community_posts').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(0, fetchLimit),
    ]);

    if (freeRes.error || commRes.error) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">글을 불러오지 못했습니다.</td></tr>';
      return;
    }

    totalCount = (freeRes.count || 0) + (commRes.count || 0);

    const freeData = (freeRes.data || []).map(p => ({ ...p, _isFree: true }));
    const commData = (commRes.data || []).map(p => ({ ...p, _isFree: false }));

    const merged = [...freeData, ...commData]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    posts = merged.slice(from, from + PAGE_SIZE);
  } else if (activeCategory === '자유') {
    const { data, error, count } = await sb
      .from('free_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">글을 불러오지 못했습니다.</td></tr>';
      return;
    }
    posts = (data || []).map(p => ({ ...p, _isFree: true }));
    totalCount = count;
  } else {
    const { data, error, count } = await sb
      .from('community_posts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)
      .eq('category', activeCategory);

    if (error) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">글을 불러오지 못했습니다.</td></tr>';
      return;
    }
    posts = (data || []).map(p => ({ ...p, _isFree: false }));
    totalCount = count;
  }

  if (!posts || posts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">아직 게시글이 없습니다. 첫 글을 작성해보세요!</td></tr>';
    renderPagination(0);
    return;
  }

  tbody.innerHTML = posts.map((post, idx) => {
    const num   = totalCount - from - idx;
    const badge = `<span class="category-badge cat-${post.category}">${escapeHtml(post.category)}</span>`;
    return `
      <tr data-id="${post.id}" data-is-free="${post._isFree}">
        <td class="col-num">${num}</td>
        <td>${badge} <span class="post-title-link">${escapeHtml(post.title)}</span></td>
        <td class="col-author">${maskEmail(post.user_email)}</td>
        <td><span class="date-text">${formatDate(post.created_at)}</span></td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openPost(row.dataset.id, row.dataset.isFree === 'true'));
  });

  renderPagination(totalCount);
}

// ===== 페이지네이션 =====
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const container  = document.getElementById('pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = Array.from({ length: totalPages }, (_, i) => {
    const p = i + 1;
    return `<button class="page-btn${p === currentPage ? ' active' : ''}" data-page="${p}">${p}</button>`;
  }).join('');

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPosts(Number(btn.dataset.page)));
  });
}

// ===== 카테고리 탭 =====
document.getElementById('category-tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  activeCategory = btn.dataset.cat;
  loadPosts(1);
});

// ===== 상세 보기 =====
async function openPost(postId, isFree = false) {
  const table = isFree ? 'free_posts' : 'community_posts';
  const { data, error } = await sb.from(table).select('*').eq('id', postId).single();
  if (error || !data) { alert('글을 불러올 수 없습니다.'); return; }

  currentPost = data;

  const badge = document.getElementById('detail-category');
  badge.textContent = data.category;
  badge.className   = `post-category-badge cat-${data.category}`;

  document.getElementById('detail-title').textContent   = data.title;
  document.getElementById('detail-author').textContent  = `작성자: ${maskEmail(data.user_email)}`;
  document.getElementById('detail-date').textContent    = formatDate(data.created_at);
  document.getElementById('detail-content').textContent = data.content;

  const actions = document.getElementById('detail-actions');
  actions.style.display = (currentUser && currentUser.id === data.user_id) ? 'flex' : 'none';

  showView('view-detail');
}

// ===== 글쓰기 =====
document.getElementById('btn-write').addEventListener('click', () => {
  if (!currentUser) { openLoginModal(); return; }
  isEditMode  = false;
  currentPost = null;
  document.getElementById('write-heading').textContent = '글쓰기';
  document.getElementById('btn-submit').textContent    = '등록하기';
  document.getElementById('input-title').value         = '';
  document.getElementById('input-content').value       = '';
  document.getElementById('input-category').value      = '자유';
  showView('view-write');
});

['btn-cancel', 'btn-cancel2'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => showView('view-list'));
});

document.getElementById('btn-back').addEventListener('click', () => {
  showView('view-list');
  loadPosts(currentPage);
});

// ===== 폼 제출 =====
document.getElementById('form-write').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title    = document.getElementById('input-title').value.trim();
  const content  = document.getElementById('input-content').value.trim();
  const category = document.getElementById('input-category').value;
  const btn      = document.getElementById('btn-submit');

  if (!title || !content) return;
  btn.disabled    = true;
  btn.textContent = isEditMode ? '수정 중...' : '등록 중...';

  if (isEditMode && currentPost) {
    const { error } = await sb
      .from('community_posts')
      .update({ title, content, category })
      .eq('id', currentPost.id);
    if (error) { alert('수정에 실패했습니다.'); }
    else       { await openPost(currentPost.id); }
  } else {
    const { error } = await sb.from('community_posts').insert({
      title,
      content,
      category,
      user_id:    currentUser.id,
      user_email: currentUser.email,
    });
    if (error) { alert('등록에 실패했습니다.'); }
    else       { showView('view-list'); loadPosts(1); }
  }

  btn.disabled    = false;
  btn.textContent = isEditMode ? '수정하기' : '등록하기';
});

// ===== 수정 =====
document.getElementById('btn-edit').addEventListener('click', () => {
  if (!currentPost) return;
  isEditMode = true;
  document.getElementById('write-heading').textContent = '글 수정';
  document.getElementById('btn-submit').textContent    = '수정하기';
  document.getElementById('input-title').value         = currentPost.title;
  document.getElementById('input-content').value       = currentPost.content;
  document.getElementById('input-category').value      = currentPost.category;
  showView('view-write');
});

// ===== 삭제 =====
document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!currentPost || !confirm('정말 삭제하시겠습니까?')) return;
  const { error } = await sb.from('community_posts').delete().eq('id', currentPost.id);
  if (error) { alert('삭제에 실패했습니다.'); }
  else       { currentPost = null; showView('view-list'); loadPosts(currentPage); }
});

// ===== 인증 모달 =====
const overlay    = document.getElementById('modal-overlay');
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

function openLoginModal() {
  overlay.classList.add('active');
  loginForm.style.display  = 'block';
  signupForm.style.display = 'none';
}

function closeModal() {
  overlay.classList.remove('active');
  document.querySelectorAll('.msg').forEach(el => el.textContent = '');
}

overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
document.getElementById('go-signup').addEventListener('click', () => {
  loginForm.style.display  = 'none';
  signupForm.style.display = 'block';
});
document.getElementById('go-login').addEventListener('click', openLoginModal);
document.getElementById('nav-login-btn').addEventListener('click', openLoginModal);
document.getElementById('nav-logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.reload();
});

document.getElementById('form-login').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg      = document.getElementById('login-msg');
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) {
    msg.textContent = '이메일 또는 비밀번호가 올바르지 않습니다.';
    msg.className   = 'msg error';
  } else {
    closeModal();
    window.location.reload();
  }
});

document.getElementById('form-signup').addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const msg      = document.getElementById('signup-msg');
  const { error } = await sb.auth.signUp({ email, password });
  if (error) {
    msg.textContent = error.message;
    msg.className   = 'msg error';
  } else {
    msg.textContent = '가입 완료! 이메일을 확인해주세요.';
    msg.className   = 'msg success';
  }
});

// ===== 자유게시판 최근 글 =====
async function loadRecentFreePosts() {
  const list = document.getElementById('recent-free-list');
  const { data, error } = await sb
    .from('free_posts')
    .select('id, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error || !data || data.length === 0) {
    list.innerHTML = '<li class="recent-free-loading">게시글이 없습니다.</li>';
    return;
  }

  list.innerHTML = data.map(post => `
    <li>
      <a href="./free-board.html">
        <span class="rf-title">${escapeHtml(post.title)}</span>
        <span class="rf-date">${formatDate(post.created_at)}</span>
      </a>
    </li>
  `).join('');
}

// ===== 초기화 =====
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user ?? null;

  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');
  loginBtn.style.display  = currentUser ? 'none'         : 'inline-block';
  logoutBtn.style.display = currentUser ? 'inline-block' : 'none';

  loadPosts(1);
  loadRecentFreePosts();
}

init();
