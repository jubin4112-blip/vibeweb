import sb from './supabase.js';

// ===== 모달 열기/닫기 =====
const overlay   = document.getElementById('modal-overlay');
const loginForm = document.getElementById('login-form');
const signupForm= document.getElementById('signup-form');

export function openLogin() {
  overlay.classList.add('active');
  loginForm.style.display  = 'block';
  signupForm.style.display = 'none';
}

export function openSignup() {
  overlay.classList.add('active');
  loginForm.style.display  = 'none';
  signupForm.style.display = 'block';
}

export function closeModal() {
  overlay.classList.remove('active');
  clearMessages();
}

function clearMessages() {
  document.querySelectorAll('.msg').forEach(el => el.textContent = '');
}

// 모달 외부 클릭 시 닫기
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) closeModal();
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
    msg.textContent = '로그인 성공! 이동 중...';
    msg.className   = 'msg success';
    setTimeout(() => { window.location.href = './pages/community.html'; }, 1000);
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

// ===== 세션 상태에 따라 네비 업데이트 =====
export async function updateNavAuth() {
  const { data: { session } } = await sb.auth.getSession();
  const loginBtn  = document.getElementById('nav-login-btn');
  const logoutBtn = document.getElementById('nav-logout-btn');

  if (session) {
    loginBtn.style.display  = 'none';
    logoutBtn.style.display = 'inline-block';
  } else {
    loginBtn.style.display  = 'inline-block';
    logoutBtn.style.display = 'none';
  }
}

// ===== 로그아웃 =====
document.getElementById('nav-logout-btn')?.addEventListener('click', async () => {
  await sb.auth.signOut();
  window.location.reload();
});
