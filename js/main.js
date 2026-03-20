import { openLogin, openSignup, closeModal, updateNavAuth } from './auth.js';

// ===== 네비 버튼 이벤트 =====
document.getElementById('nav-login-btn')?.addEventListener('click', openLogin);
document.getElementById('cta-btn')?.addEventListener('click', openLogin);

// 모달 내 전환 링크
document.getElementById('go-signup')?.addEventListener('click', openSignup);
document.getElementById('go-login')?.addEventListener('click', openLogin);

// 모달 닫기 버튼
document.querySelectorAll('.modal-close').forEach(btn => {
  btn.addEventListener('click', closeModal);
});

// ===== 스크롤 페이드 애니메이션 =====
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ===== 네비 스크롤 강조 =====
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-links a[href^="#"]');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) {
      current = sec.getAttribute('id');
    }
  });

  navLinks.forEach(link => {
    link.style.color = link.getAttribute('href') === `#${current}` ? '#F0F0F0' : '';
  });
});

// ===== 초기화 =====
updateNavAuth();
