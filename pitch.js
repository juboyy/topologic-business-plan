(() => {
  'use strict';
  const slides = [...document.querySelectorAll('.slide')];
  const select = document.getElementById('slide-index');
  const previous = document.getElementById('previous');
  const next = document.getElementById('next');
  const mode = document.getElementById('mode');
  const announcer = document.getElementById('announcer');
  let current = 0;
  let linear = false;
  const fromHash = () => {
    const match = location.hash.match(/^#slide-(\d+)$/);
    return match ? Math.max(0, Math.min(slides.length - 1, Number(match[1]) - 1)) : 0;
  };
  function show(index, updateHash = true, scroll = true) {
    current = Math.max(0, Math.min(slides.length - 1, index));
    slides.forEach((slide, i) => {
      slide.classList.toggle('current', i === current);
      // CSS controls presentation visibility; print and linear reading always retain every slide.
      slide.removeAttribute('aria-hidden');
    });
    select.value = String(current + 1);
    previous.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    announcer.textContent = `Slide ${current + 1} de ${slides.length}: ${slides[current].dataset.title}`;
    if (updateHash && location.hash !== `#${slides[current].id}`) {
      history.pushState(null, '', `#${slides[current].id}`);
    }
    if (scroll) {
      if (linear) slides[current].scrollIntoView({ block: 'start', behavior: 'instant' });
      else window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
  function setMode(value) {
    linear = value;
    document.body.dataset.mode = linear ? 'linear' : 'present';
    mode.setAttribute('aria-pressed', String(linear));
    mode.textContent = linear ? 'Apresentar slides' : 'Leitura contínua';
    show(current, false);
  }
  previous.addEventListener('click', () => show(current - 1));
  next.addEventListener('click', () => show(current + 1));
  select.addEventListener('change', () => show(Number(select.value) - 1));
  mode.addEventListener('click', () => setMode(!linear));
  window.addEventListener('hashchange', () => show(fromHash(), false));
  window.addEventListener('popstate', () => show(fromHash(), false));
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    const keys = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: slides.length - 1 };
    if (Object.prototype.hasOwnProperty.call(keys, event.key)) {
      event.preventDefault();
      show(keys[event.key]);
    }
  });
  document.body.dataset.mode = 'present';
  show(fromHash(), false, false);
})();
