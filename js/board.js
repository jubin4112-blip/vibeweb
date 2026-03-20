import sb from './supabase.js';

// ===== 상태 =====
let currentUser = null;
let currentPost = null;
let isEditMode = false;
let currentPage = 1;
const PAGE_SIZE = 10;

// ===== 뷰 전환 =====
function showView(viewId) {
  ['view-list', 'view-write', 'view-detail'].forEach(id => {
    document.getElementById(id).style.display = id === viewId ? 'block' : 'none';
  });
}

// ===== 날짜 포맷 =====
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

// ===== 이메일 마스킹 =====
function maskEmail(email) {
  const [id, domain] = email.split('@');
  if (id.length <= 2) return `${id[0]}*@${domain}`;
  return `${id.slice(0, 2)}${'*'.repeat(Math.min(id.length - 2, 4))}@${domain}`;
}

// ===== 글 목록 로드 =====
async function loadPosts(page = 1) {
  currentPage = page;
  const tbody = document.getElementById('post-list');
  tbody.innerHTML = '<tr><td colspan="4" class="empty-msg">불러오는 중...</td></tr>';

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

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

  // 행 클릭 이벤트
  tbody.querySelectorAll('tr[data-id]').forEach(row => {
    row.addEventListener('click', () => openPost(row.dataset.id));
  });

  renderPagination(count);
}

// ===== 페이지네이션 =====
function renderPagination(total) {
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const container = document.getElementById('pagination');
  if (totalPages <= 1) { container.innerHTML = ''; return; }

  container.innerHTML = Array.from({ length: totalPages }, (_, i) => {
    const p = i + 1;
    return `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`;
  }).join('');

  container.querySelectorAll('.page-btn').forEach(btn => {
    btn.addEventListener('click', () => loadPosts(Number(btn.dataset.page)));
  });
}

// ===== 글 상세 보기 =====
async function openPost(postId) {
  const { data, error } = await sb.from('posts').select('*').eq('id', postId).single();
  if (error || !data) { alert('글을 불러올 수 없습니다.'); return; }

  currentPost = data;

  document.getElementById('detail-title').textContent = data.title;
  document.getElementById('detail-author').textContent = `작성자: ${maskEmail(data.user_email)}`;
  document.getElementById('detail-date').textContent = formatDate(data.created_at);
  document.getElementById('detail-content').textContent = data.content;

  const actions = document.getElementById('detail-actions');
  if (currentUser && currentUser.id === data.user_id) {
    actions.style.display = 'flex';
  } else {
    actions.style.display = 'none';
  }

  showView('view-detail');
}

// ===== XSS 방어 =====
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== 글쓰기 버튼 =====
document.getElementById('btn-write').addEventListener('click', () => {
  if (!currentUser) {
    openLogin();
    return;
  }
  isEditMode = false;
  currentPost = null;
  document.getElementById('write-title-heading').textContent = '글쓰기';
  document.getElementById('btn-submit-write').textContent = '등록하기';
  document.getElementById('input-title').value = '';
  document.getElementById('input-content').value = '';
  showView('view-write');
});

// ===== 취소 =====
document.getElementById('btn-cancel-write').addEventListener('click', () => showView('view-list'));
document.getElementById('btn-back').addEventListener('click', () => {
  showView('view-list');
  loadPosts(currentPage);
});

// ===== 글 등록/수정 폼 =====
document.getElementById('form-write').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title   = document.getElementById('input-title').value.trim();
  const content = document.getElementById('input-content').value.trim();
  const btn     = document.getElementById('btn-submit-write');

  if (!title || !content) return;

  btn.disabled = true;
  btn.textContent = isEditMode ? '수정 중...' : '등록 중...';

  if (isEditMode && currentPost) {
    const { error } = await sb
      .from('posts')
      .update({ title, content })
      .eq('id', currentPost.id);

    if (error) {
      alert('수정에 실패했습니다.');
    } else {
      await openPost(currentPost.id);
      showView('view-detail');
    }
  } else {
    const { error } = await sb.from('posts').insert({
      title,
      content,
      user_id: currentUser.id,
      user_email: currentUser.email,
    });

    if (error) {
      alert('등록에 실패했습니다.');
    } else {
      showView('view-list');
      loadPosts(1);
    }
  }

  btn.disabled = false;
  btn.textContent = isEditMode ? '수정하기' : '등록하기';
});

// ===== 수정 버튼 =====
document.getElementById('btn-edit').addEventListener('click', () => {
  if (!currentPost) return;
  isEditMode = true;
  document.getElementById('write-title-heading').textContent = '글 수정';
  document.getElementById('btn-submit-write').textContent = '수정하기';
  document.getElementById('input-title').value = currentPost.title;
  document.getElementById('input-content').value = currentPost.content;
  showView('view-write');
});

// ===== 삭제 버튼 =====
document.getElementById('btn-delete').addEventListener('click', async () => {
  if (!currentPost) return;
  if (!confirm('정말 삭제하시겠습니까?')) return;

  const { error } = await sb.from('posts').delete().eq('id', currentPost.id);

  if (error) {
    alert('삭제에 실패했습니다.');
  } else {
    currentPost = null;
    showView('view-list');
    loadPosts(currentPage);
  }
});

// ===== 인증 모달 =====
const overlay    = document.getElementById('modal-overlay');
const loginForm  = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

function openLogin() {
  overlay.classList.add('active');
  loginForm.style.display  = 'block';
  signupForm.style.display = 'none';
}

function closeModal() {
  overlay.classList.remove('active');
  document.querySelectorAll('.msg').forEach(el => el.textContent = '');
}

overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', closeModal));
document.getElementById('go-signup').addEventListener('click', () => {
  loginForm.style.display  = 'none';
  signupForm.style.display = 'block';
});
document.getElementById('go-login').addEventListener('click', openLogin);

document.getElementById('nav-login-btn').addEventListener('click', openLogin);
document.getElementById('nav-logout-btn').addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.reload();
});

// ===== 로그인 =====
document.getElementById('form-login').addEventListener('submit', async (e) => {
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

// ===== 회원가입 =====
document.getElementById('form-signup').addEventListener('submit', async (e) => {
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

// ===== 초기화 =====
async function init() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user ?? null;

  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');

  if (currentUser) {
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    loginBtn.style.display  = 'inline-block';
    logoutBtn.style.display = 'none';
  }

  loadPosts(1);
}

init();
