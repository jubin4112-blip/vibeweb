// ===========================
// Slide
// ===========================
(function () {
  const list   = document.querySelector('.slide-list');
  const items  = document.querySelectorAll('.slide-list li');
  const dots   = document.querySelectorAll('#slide .dot');
  const btnPrev = document.querySelector('.slide-btn.prev');
  const btnNext = document.querySelector('.slide-btn.next');
  const total  = items.length;
  let current  = 0;
  let timer;

  function goTo(idx) {
    current = (idx + total) % total;
    list.style.transform = `translateX(-${current * 100}%)`;
    dots.forEach((d, i) => d.classList.toggle('active', i === current));
  }

  function startAuto() {
    timer = setInterval(() => goTo(current + 1), 4000);
  }

  function resetAuto() {
    clearInterval(timer);
    startAuto();
  }

  btnPrev.addEventListener('click', () => { goTo(current - 1); resetAuto(); });
  btnNext.addEventListener('click', () => { goTo(current + 1); resetAuto(); });
  dots.forEach((dot, i) => dot.addEventListener('click', () => { goTo(i); resetAuto(); }));

  startAuto();
})();
