(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const select = document.getElementById('slide-index');
  const prev = document.getElementById('previous');
  const next = document.getElementById('next');
  const mode = document.getElementById('mode');
  const live = document.getElementById('announcer');
  const deck = document.getElementById('deck');
  let current = 0;
  let reading = matchMedia('(max-width:760px)').matches;
  const fromHash = () => {
    const n = Number(location.hash.replace('#slide-', ''));
    return Number.isInteger(n) && n > 0 && n <= slides.length ? n - 1 : 0;
  };
  function show(index, { scroll = true, announce = true, hash = true } = {}) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => slide.classList.toggle('active', i === current));
    select.value = String(current + 1);
    prev.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    if (hash) history.replaceState(null, '', `#slide-${String(current + 1).padStart(2, '0')}`);
    if (announce) live.textContent = `${current + 1} de ${slides.length}. ${slides[current].dataset.title}`;
    if (scroll) {
      // Instant navigation prevents the reading observer from tracking intermediate slides.
      if (reading) slides[current].scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function setMode() {
    document.body.classList.toggle('deck-mode', !reading);
    mode.setAttribute('aria-pressed', String(reading));
    mode.textContent = reading ? 'Modo apresentação' : 'Leitura contínua';
    show(current, { announce: false });
  }
  prev.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  select.addEventListener('change', () => show(Number(select.value) - 1));
  mode.addEventListener('click', () => { reading = !reading; setMode(); });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable]')) return;
    let index = current;
    if (['ArrowRight', 'PageDown'].includes(event.key)) index++;
    else if (['ArrowLeft', 'PageUp'].includes(event.key)) index--;
    else if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = slides.length - 1;
    else if (event.key === ' ' && !event.target.closest('button,a')) index += event.shiftKey ? -1 : 1;
    else return;
    event.preventDefault();
    show(index);
  });
  let start = null;
  deck.addEventListener('touchstart', event => {
    start = event.touches.length === 1 && !event.target.closest('a,button,select')
      ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
  }, { passive: true });
  deck.addEventListener('touchend', event => {
    if (!start || event.changedTouches.length !== 1) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    start = null;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.7) show(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  window.addEventListener('hashchange', () => show(fromHash(), { hash: false }));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      if (!reading) return;
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) show(slides.indexOf(visible[0].target), { scroll: false, announce: false, hash: false });
    }, { threshold: [.15, .5, .75], rootMargin: '-100px 0px -15% 0px' });
    slides.forEach(slide => observer.observe(slide));
  }
  current = fromHash();
  setMode();
})();
