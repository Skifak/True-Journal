<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { gsap } from 'gsap';
  import Observer from 'gsap/Observer';
  import Background from './Background.svelte';
  import Logo from './Logo.svelte';
  import { BRAND } from './lib/brand';

  // Discipline table → ring: percentage is derived from the rows below the
  // circle, so the big number, the table and the arc always agree.
  const habits = [
    { label: 'Риск в пределах плана', done: 24, total: 27 },
    { label: 'Записаны причины входа', done: 21, total: 27 },
    { label: 'Итог дня подведён', done: 18, total: 27 },
  ];
  const RING_RADIUS = 73;
  const RING_LENGTH = 2 * Math.PI * RING_RADIUS; // ≈ 458.67
  const habitsDone = habits.reduce((sum, h) => sum + h.done, 0);
  const habitsTotal = habits.reduce((sum, h) => sum + h.total, 0);
  const planPercent = Math.round((habitsDone / habitsTotal) * 100); // 63/81 → 78
  const ringDash = ((planPercent / 100) * RING_LENGTH).toFixed(2);

  // Top-level plugin registration: done once for the module, outside any lifecycle.
  gsap.registerPlugin(Observer);

  let view: 'home' | 'menu' | 'about' = 'home';
  let page: HTMLElement;
  let reduced = false;
  let resumeHome: () => void = () => {};
  let leaveHome: () => void = () => {};

  async function show(next: 'home' | 'menu' | 'about'): Promise<void> {
    const wasHome = view === 'home';
    view = next;
    // Leaving home: revert the GSAP context while the old DOM is still mounted.
    if (wasHome && next !== 'home') leaveHome();
    // Returning home: wait for Svelte to flush the DOM, then rebuild the context.
    if (next === 'home' && !wasHome) {
      await tick();
      resumeHome();
    }
  }

  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = media.matches;

    // Navigation state shared between rebuilds so the keyboard fallback keeps
    // working in reduced-motion mode (where Observer is never created).
    const nav = {
      slides: [] as HTMLElement[],
      currentIndex: 0,
      locked: false,
      move: null as null | ((direction: number, axis?: 'vertical' | 'horizontal') => void),
      jump: null as null | ((index: number, direction: number) => void),
      inFeatures: (): boolean => false,
    };

    const isInteractive = (event: Event | undefined): boolean => {
      const target = event?.target as HTMLElement | null;
      return !!target?.closest('input, textarea, select, [contenteditable="true"], button, a, .menu-panel, .about-panel');
    };

    // Persistent keyboard navigation (works with and without Observer).
    const keyHandler = (event: KeyboardEvent): void => {
      if (view !== 'home' || isInteractive(event) || !nav.move) return;
      if (event.key === 'Home') { event.preventDefault(); if (!nav.locked && nav.jump) nav.jump(0, -1); return; }
      if (event.key === 'End') { event.preventDefault(); if (!nav.locked && nav.jump) nav.jump(nav.slides.length - 1, 1); return; }
      const direction = ['ArrowDown', 'PageDown'].includes(event.key) ? 1 : ['ArrowUp', 'PageUp'].includes(event.key) ? -1 : 0;
      if (nav.inFeatures() && event.key === 'ArrowRight') { event.preventDefault(); nav.move(1, 'horizontal'); return; }
      if (nav.inFeatures() && event.key === 'ArrowLeft') { event.preventDefault(); nav.move(-1, 'horizontal'); return; }
      if (direction) { event.preventDefault(); nav.move(direction); }
    };
    window.addEventListener('keydown', keyHandler);

    let cleanup: (() => void) | null = null;

    const build = (): void => {
      if (!page || cleanup) return;
      const story = page.querySelector<HTMLElement>('[data-story-section]');
      const storyLines = story ? [...story.querySelectorAll<HTMLElement>('[data-story-line]')] : [];
      let slides = [...page.querySelectorAll<HTMLElement>('[data-page-section]')];
      let currentIndex = nav.currentIndex;
      let locked = false;
      const featureStart = 5;
      const featureEnd = 8;
      const inFeatures = (): boolean => currentIndex >= featureStart && currentIndex <= featureEnd;

      let sectionObserver: Observer | null = null;
      let svgObserver: IntersectionObserver | null = null;
      const disposers: Array<() => void> = [];

      const ctx = gsap.context(() => {
        const reveal = (slide: HTMLElement): void => {
          const content = slide.querySelectorAll('[data-reveal]');
          if (reduced) { gsap.set(content, { clearProps: 'all' }); return; }
          gsap.fromTo(content,
            { opacity: 0, y: 26, willChange: 'transform, opacity' },
            { opacity: 1, y: 0, duration: .72, stagger: .1, ease: 'power3.out', onComplete: () => gsap.set(content, { clearProps: 'willChange' }) });
          slide.querySelectorAll<SVGGeometryElement>('path, circle').forEach((shape) => {
            if (typeof shape.getTotalLength !== 'function') return;
            // The progress ring keeps its derived dasharray (78% of circumference);
            // animate only its dashoffset so the arc never fills to 100%.
            if (shape.classList.contains('progress')) {
              const dash = parseFloat(getComputedStyle(shape).strokeDasharray) || 357.76;
              gsap.fromTo(shape,
                { strokeDashoffset: dash, opacity: 0, willChange: 'transform, opacity' },
                { strokeDashoffset: 0, opacity: 1, duration: .95, ease: 'power2.out', onComplete: () => gsap.set(shape, { clearProps: 'willChange' }) });
              return;
            }
            const length = shape.getTotalLength();
            // Explicit fromTo: start/end states defined here, not via earlier inline styles.
            gsap.fromTo(shape,
              { strokeDasharray: length, strokeDashoffset: length, opacity: 0, willChange: 'transform, opacity' },
              { strokeDashoffset: 0, opacity: 1, duration: .95, ease: 'power2.out', onComplete: () => gsap.set(shape, { clearProps: 'willChange' }) });
          });
        };
        const activate = (index: number, direction = 1, axis: 'vertical' | 'horizontal' = 'vertical'): void => {
          currentIndex = Math.max(0, Math.min(slides.length - 1, index));
          nav.currentIndex = currentIndex;
          slides.forEach((slide, i) => {
            slide.classList.toggle('is-active', i === currentIndex);
            slide.setAttribute('aria-hidden', i === currentIndex ? 'false' : 'true');
            gsap.set(slide, { autoAlpha: i === currentIndex ? 1 : 0, zIndex: i === currentIndex ? 2 : 0 });
          });
          const active = slides[currentIndex];
          // Live counter: only remaining section indicator (static per-slide numbers removed).
          const counter = page.querySelector<HTMLElement>('[data-slide-current]');
          if (counter) counter.textContent = String(currentIndex + 1).padStart(2, '0');
          if (!active) return;
          if (!reduced) {
            const movement = axis === 'horizontal' ? { xPercent: direction > 0 ? 10 : -10 } : { yPercent: direction > 0 ? 10 : -10 };
            const settle = axis === 'horizontal' ? { xPercent: 0 } : { yPercent: 0 };
            gsap.fromTo(active, { ...movement, opacity: .35, willChange: 'transform, opacity' }, { ...settle, opacity: 1, duration: 1, ease: 'power3.out', onComplete: () => gsap.set(active, { clearProps: 'willChange' }) });
          }
          reveal(active);
        };
        const move = (direction: number, axis: 'vertical' | 'horizontal' = 'vertical'): void => {
          if (locked || view !== 'home') return;
          const next = currentIndex + direction;
          if (next < 0 || next >= slides.length) return;
          locked = true;
          nav.locked = true;
          const current = slides[currentIndex];
          const target = slides[next];
          if (reduced) {
            activate(next, direction);
            locked = false;
            nav.locked = false;
            return;
          }
          const axisProp = axis === 'horizontal' ? 'xPercent' : 'yPercent';
          const neutralAxis = axis === 'horizontal' ? { yPercent: 0 } : { xPercent: 0 };
          const timeline = gsap.timeline({ onComplete: () => { locked = false; nav.locked = false; gsap.set([current, target], { clearProps: 'willChange' }); } });
          timeline.set(current, { ...neutralAxis, willChange: 'transform, opacity' }, 0)
            .to(current, { [axisProp]: direction > 0 ? -10 : 10, opacity: 0, duration: .7, ease: 'power2.inOut' }, 0)
            .add(() => { activate(next, direction, axis); gsap.set(target, { ...neutralAxis, [axisProp]: direction > 0 ? 10 : -10, opacity: 0, willChange: 'transform, opacity' }); }, .22)
            .to(target, { [axisProp]: 0, opacity: 1, duration: .95, ease: 'power3.out' }, .24);
        };
        const updateStory = (): void => {
          if (!story || !storyLines.length) return;
        };

        // Pre-hide SVG shapes via gsap.set inside the context so a revert
        // restores their original (CSS-defined) state — no manual inline styles.
        const svgElements = [...page.querySelectorAll<SVGSVGElement>('.visual svg, .review-visual svg, .progress-ring svg')];
        const svgPaths = svgElements.flatMap((svg) => [...svg.querySelectorAll<SVGGeometryElement>('path, circle')]);
        if (!reduced) {
          svgPaths.forEach((shape) => {
            if (typeof shape.getTotalLength !== 'function') return;
            // Progress ring: pre-set dashoffset only, preserve its 78% dasharray.
            if (shape.classList.contains('progress')) {
              const dash = parseFloat(getComputedStyle(shape).strokeDasharray) || 357.76;
              gsap.set(shape, { strokeDashoffset: dash, opacity: 0 });
              return;
            }
            const length = shape.getTotalLength();
            gsap.set(shape, { strokeDasharray: length, strokeDashoffset: length, opacity: 0 });
          });
        }
        svgObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const shapes = [...entry.target.querySelectorAll<SVGGeometryElement>('path, circle')];
            if (!reduced) {
              gsap.set(shapes, { willChange: 'transform, opacity' });
              // Dasharray preservation for the 82% ring is handled at pre-hide;
              // this tween only animates offset/opacity/scale, never dasharray.
              gsap.to(shapes, { strokeDashoffset: 0, opacity: 1, scale: 1, transformOrigin: 'center', duration: 1.35, stagger: 0.08, ease: 'power2.out', onComplete: () => gsap.set(shapes, { clearProps: 'willChange' }) });
            } else gsap.set(shapes, { clearProps: 'all' });
            svgObserver?.unobserve(entry.target);
          }
        }, { threshold: 0.35 });
        svgElements.forEach((svg) => svgObserver?.observe(svg));

        activate(currentIndex, 1);

        // Observer only when motion is allowed; killed on teardown / view change.
        if (!reduced) {
          sectionObserver = Observer.create({
            target: window,
            type: 'wheel,touch,pointer',
            wheelSpeed: 1,
            tolerance: 10,
            lockAxis: true,
            preventDefault: true,
            onDown: (self) => { if (!isInteractive(self.event)) move(1, inFeatures() && currentIndex < featureEnd ? 'horizontal' : 'vertical'); },
            onUp: (self) => { if (!isInteractive(self.event)) move(-1, inFeatures() && currentIndex > featureStart ? 'horizontal' : 'vertical'); },
            onLeft: (self) => { if (!isInteractive(self.event) && inFeatures() && currentIndex < featureEnd) move(1, 'horizontal'); },
            onRight: (self) => { if (!isInteractive(self.event) && inFeatures() && currentIndex > featureStart) move(-1, 'horizontal'); },
          });
        } else {
          // No Observer in reduced-motion: gate the lightweight fallback
          // wheel/touch listeners behind this branch only (no duplicates).
          let touchX = 0;
          let touchY = 0;
          const fallbackWheel = (event: WheelEvent): void => {
            if (view !== 'home' || isInteractive(event) || Math.abs(event.deltaY) < 10) return;
            event.preventDefault();
            const horizontal = inFeatures() && (event.deltaY !== 0 || event.deltaX !== 0);
            const delta = event.deltaX || event.deltaY;
            move(delta > 0 ? 1 : -1, horizontal && ((delta > 0 && currentIndex < featureEnd) || (delta < 0 && currentIndex > featureStart)) ? 'horizontal' : 'vertical');
          };
          const fallbackTouchStart = (event: TouchEvent): void => { touchX = event.touches[0]?.clientX ?? 0; touchY = event.touches[0]?.clientY ?? 0; };
          const fallbackTouchEnd = (event: TouchEvent): void => {
            if (view !== 'home' || isInteractive(event)) return;
            const deltaX = touchX - (event.changedTouches[0]?.clientX ?? touchX);
            const deltaY = touchY - (event.changedTouches[0]?.clientY ?? touchY);
            if (inFeatures() && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= 24) move(deltaX > 0 ? 1 : -1, 'horizontal');
            else if (Math.abs(deltaY) >= 24) move(deltaY > 0 ? 1 : -1, 'vertical');
          };
          window.addEventListener('wheel', fallbackWheel, { passive: false });
          window.addEventListener('touchstart', fallbackTouchStart, { passive: true });
          window.addEventListener('touchend', fallbackTouchEnd, { passive: true });
          disposers.push(() => {
            window.removeEventListener('wheel', fallbackWheel);
            window.removeEventListener('touchstart', fallbackTouchStart);
            window.removeEventListener('touchend', fallbackTouchEnd);
          });
        }

        updateStory();
        const onScroll = (): void => updateStory();
        const onResize = (): void => updateStory();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onResize, { passive: true });
        disposers.push(() => {
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onResize);
        });

        nav.slides = slides;
        nav.move = move;
        nav.jump = (index: number, direction: number): void => { if (!locked) activate(index, direction); };
        nav.inFeatures = inFeatures;
      }, page);

      cleanup = () => {
        sectionObserver?.kill();
        svgObserver?.disconnect();
        disposers.forEach((dispose) => dispose());
        ctx.revert();
        nav.move = null;
        nav.jump = null;
        nav.inFeatures = (): boolean => false;
        nav.locked = false;
        cleanup = null;
      };
    };

    resumeHome = build;
    leaveHome = () => { cleanup?.(); };

    build();

    // React to prefers-reduced-motion changes at runtime: rebuild (or not).
    const motionChange = (event: MediaQueryListEvent): void => {
      reduced = event.matches;
      if (view === 'home') { leaveHome(); resumeHome(); }
    };
    media.addEventListener('change', motionChange);
    return () => {
      media.removeEventListener('change', motionChange);
      window.removeEventListener('keydown', keyHandler);
      leaveHome();
      resumeHome = () => {};
      leaveHome = () => {};
    };
  });
</script>

<svelte:head>
  <noscript>
    <style>
      /* Без JS: показываем все секции в обычном потоке, разрешаем прокрутку */
      .page-section, .feature-section, .story-section { position: static; min-height: auto; overflow: visible; visibility: visible; opacity: 1; pointer-events: auto; }
      .story-sticky { position: static; height: auto; }
      body { overflow: auto; }
    </style>
  </noscript>
</svelte:head>

<Background />

<!-- Mobile-only compact header: brand + menu trigger in one top panel.
     Hidden on desktop, where the fixed .menu-trigger below is used. -->
<div class="mobile-header" class:mobile-header--hidden={view !== 'home'} inert={view !== 'home'}>
  <div class="mobile-brand"><Logo brand={{ name: BRAND.name, tagline: '' }} /></div>
  <button class="mobile-menu-btn" onclick={() => show('menu')} aria-expanded={view !== 'home'}>Меню <span aria-hidden="true">↗</span></button>
</div>

<button class="menu-trigger desktop-only-trigger" class:desktop-only-trigger-hidden={view !== 'home'} onclick={() => show('menu')} aria-expanded={view !== 'home'}>Открыть меню <span aria-hidden="true">↗</span></button>

<main bind:this={page} class="screen" class:screen--panel={view !== 'home'}>
  {#if view === 'home'}
    <div class="landing">
      <section class="hero page-section" data-page-section aria-label="True Journal">
        <Logo brand={BRAND} />
      </section>
      {#each ['Открытый исходный код', 'Возможность глубокого анализа твоих результатов', 'Свяжи ИИ с твоим журналом', 'Обучающие материалы о рынках и трейдинге'] as storyLine, loopIndex}
        <section class="story-section page-section story-slide" data-page-section aria-label={`Принцип ${loopIndex + 1}`}>
          <div class="story-sticky"><div class="story-lines"><p data-story-line>{storyLine}</p></div></div>
        </section>
      {/each}
      <section class="feature-section page-section journal" data-page-section aria-labelledby="journal-title">
        <div class="glass-grain" aria-hidden="true"></div>
        <div class="section-copy" data-reveal><p class="eyebrow">01 ／ ФИКСИРУЙТЕ</p><h2 id="journal-title">Каждая сделка<br /><em>имеет значение.</em></h2><p>Записывайте входы, выходы и контекст решения. Личный торговый дневник помогает не терять детали и видеть за цифрами собственные привычки.</p><a href="https://app.truejournal.ru/" class="text-link">Начать вести журнал <span>↗</span></a></div>
        <div class="visual visual--journal" data-reveal aria-hidden="true"><div class="visual-label">TRADE LOG <span>● LIVE</span></div><div class="trade-row"><b>EUR / USD</b><span>BUY · 1.0842</span><strong>+1.8R</strong></div><div class="trade-row"><b>NASDAQ</b><span>SELL · 18,642</span><strong>+0.9R</strong></div><div class="trade-row muted"><b>GOLD</b><span>WAIT · наблюдение</span><strong>—</strong></div><svg viewBox="0 0 440 100"><path d="M0 72 C30 71 35 48 68 55 S103 79 135 48 175 43 198 56 229 30 258 39 290 65 315 37 351 45 377 20 410 35 440 9" fill="none" stroke="rgba(200,220,208,.8)" stroke-width="1.5"/><path d="M0 82H440" stroke="rgba(255,255,255,.14)"/></svg><div class="visual-foot">РЕШЕНИЕ · РИСК · РЕЗУЛЬТАТ <span>→</span></div></div>
      </section>
      <section class="feature-section page-section review" data-page-section aria-labelledby="review-title">
        <div class="glass-grain" aria-hidden="true"></div>
        <div class="review-visual" data-reveal aria-hidden="true"><svg viewBox="0 0 500 270"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="rgba(235,244,239,.12)" stroke-width="1"/></pattern></defs><rect width="500" height="270" fill="url(#grid)"/><path d="M18 218 C74 195 85 212 126 170 S186 176 215 132 265 154 300 93 350 124 384 75 442 94 482 29" fill="none" stroke="rgba(190,218,202,.86)" stroke-width="2"/><g fill="rgba(190,218,202,.8)"><circle cx="126" cy="170" r="3"/><circle cx="215" cy="132" r="3"/><circle cx="300" cy="93" r="3"/><circle cx="384" cy="75" r="3"/></g></svg><div class="chart-caption"><span>РИТМ НЕДЕЛИ</span><span>+12.4% <i>↗</i></span></div><div class="week"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div></div>
        <div class="section-copy" data-reveal><p class="eyebrow">02 ／ ПОНИМАЙТЕ</p><h2 id="review-title">Опыт становится<br /><em>вашим преимуществом.</em></h2><p>Аналитика, статистика и графики раскрывают, что работает именно у вас. Разбирайте день по горячим следам в календаре и превращайте наблюдения в следующий уверенный шаг.</p><a href="https://app.truejournal.ru/" class="text-link">Путь к ясным решениям <span>↗</span></a></div>
      </section>
      <section class="feature-section page-section calendar" data-page-section aria-labelledby="calendar-title">
        <div class="glass-grain" aria-hidden="true"></div><div class="section-copy" data-reveal><p class="eyebrow">03 ／ РАЗБИРАЙТЕ</p><h2 id="calendar-title">День за днём.<br /><em>Без белых пятен.</em></h2><p>Торговый календарь собирает сделки и заметки в цельную картину. Возвращайтесь к каждому дню, отмечайте состояние и находите решения, которые стоит повторить — или оставить в прошлом.</p><a href="https://app.truejournal.ru/" class="text-link">Разобрать свой ритм <span>↗</span></a></div>
        <div class="calendar-visual" data-reveal aria-hidden="true"><div class="calendar-head"><span>ОКТЯБРЬ 2026</span><span>←　→</span></div><div class="calendar-grid"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span>{#each ['28','29','30','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','1'] as day, i}<b class:day-muted={i < 3 || i > 33} class:day-mark={['7','14','21','28'].includes(day) && i > 3}>{day}{#if ['7','14','21','28'].includes(day) && i > 3}<i></i>{/if}</b>{/each}</div><div class="calendar-note"><span>СР · 14 ОКТЯБРЯ</span><strong>3 сделки <i>·</i> дневной разбор сохранён</strong></div></div>
      </section>
      <section class="feature-section page-section discipline" data-page-section aria-labelledby="discipline-title">
        <div class="glass-grain glass-panel" aria-hidden="true"></div><div class="discipline-visual" data-reveal aria-hidden="true"><div class="visual-label">ДИСЦИПЛИНА <span>ПОСЛЕДНИЕ 30 ДНЕЙ</span></div><div class="progress-ring"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="73"/><circle class="progress" cx="90" cy="90" r="73" stroke-dasharray="{ringDash} {RING_LENGTH.toFixed(2)}"/></svg><div><strong>{planPercent}%</strong><span>ДИСЦИПЛИНА<br />ПРЕВЫШЕ ВСЕГО</span></div></div><div class="habit-line"><span>{habits[0].label}</span><b>{habits[0].done} / {habits[0].total}</b></div><div class="habit-line"><span>{habits[1].label}</span><b>{habits[1].done} / {habits[1].total}</b></div><div class="habit-line"><span>{habits[2].label}</span><b>{habits[2].done} / {habits[2].total}</b></div><div class="visual-foot">ПОСЛЕДОВАТЕЛЬНОСТЬ ВАЖНЕЕ ИДЕАЛА <span>↗</span></div></div>
        <div class="section-copy" data-reveal><p class="eyebrow">04 ／ СОБЛЮДАЙТЕ</p><h2 id="discipline-title">Прогресс — это<br /><em>верность своему плану.</em></h2><p>Отслеживайте привычки и дисциплину вместе с результатом. Статистика помогает увидеть, где вы держитесь выбранного риска, а где пора изменить подход.</p><a href="https://app.truejournal.ru/" class="text-link">Двигаться осознанно <span>↗</span></a></div>
      </section>
      <section class="feature-section page-section footer-slide" data-page-section aria-labelledby="footer-title">
        <div class="section-copy" data-reveal><p class="eyebrow">TRUE JOURNAL ／ 10</p><h2 id="footer-title">Начните<br /><em>уже сегодня.</em></h2><p>Место для ясных решений — сегодня и в каждом следующем торговом дне.</p><nav class="footer-links" aria-label="Ссылки сайта"><a class="footer-app" href="https://app.truejournal.ru/">Открыть журнал <span>↗</span></a><button onclick={() => show('about')}>О журнале <span>↗</span></button><a href="https://t.me/TJ_TradeJournal">Группа в Telegram <span>↗</span></a><a href="https://t.me/mr_skifak">Связаться <span>↗</span></a></nav><small>© TRUE JOURNAL · ТОРГОВЫЙ ЖУРНАЛ СДЕЛОК</small></div>
      </section>
      <span class="slide-index" aria-hidden="true">TRUE JOURNAL <i>／</i> <b data-slide-current>01</b> · 10</span>
    </div>
  {:else if view === 'menu'}
    <section class="menu-panel" aria-label="Главное меню">
      <div class="panel-top"><p class="eyebrow">TRUE JOURNAL <span>／ 01</span></p><button class="close" onclick={() => show('home')} aria-label="Закрыть меню">×</button></div>
      <nav class="menu-links" aria-label="Разделы">
        <a href="https://app.truejournal.ru/"><span class="index">01</span>Открыть журнал<span class="arrow">↗</span></a>
        <button onclick={() => show('about')}><span class="index">02</span>О журнале<span class="arrow">↗</span></button>
        <a href="https://t.me/TJ_TradeJournal"><span class="index">03</span>Группа в Telegram<span class="arrow">↗</span></a>
        <a href="https://t.me/mr_skifak"><span class="index">04</span>Связаться<span class="arrow">↗</span></a>
      </nav>
      <p class="panel-foot">Место для ясных решений.</p>
    </section>
  {:else}
    <section class="about-panel" aria-labelledby="about-title">
      <div class="about-topline">
        <div class="about-brand about-brand--inline"><Logo brand={{ name: 'True Journal', tagline: '' }} /></div>
        <button class="close" onclick={() => show('menu')} aria-label="Назад в меню">×</button>
      </div>
      <div class="about-content">
        <div class="about-copy">
          <p class="eyebrow">РЕСУРСЫ ЖУРНАЛА</p>
          <h1 id="about-title">Всё для ваших<br /><em>ясных решений.</em></h1>
          <p class="description">True Journal — личное пространство для торговых решений. Записывайте сделки, замечайте закономерности и превращайте опыт в понятную стратегию.</p>
          <nav class="about-links" aria-label="Ресурсы журнала">
            <a class="about-app" href="https://app.truejournal.ru/">
              <span class="res-index">01</span>
              <span class="res-body"><b>Открыть журнал</b><small>приложение — app.truejournal.ru</small></span>
              <span class="res-arrow" aria-hidden="true">↗</span>
            </a>
            <a href="https://t.me/TJ_TradeJournal" rel="noopener">
              <span class="res-index">02</span>
              <span class="res-body"><b>Группа в Telegram</b><small>сообщество и обучающие материалы</small></span>
              <span class="res-arrow" aria-hidden="true">↗</span>
            </a>
            <a href="https://t.me/mr_skifak" rel="noopener">
              <span class="res-index">03</span>
              <span class="res-body"><b>Автор — @mr_skifak</b><small>вопросы и обратная связь в личку</small></span>
              <span class="res-arrow" aria-hidden="true">↗</span>
            </a>
          </nav>
          <div class="about-meta"><span>01 — ФИКСИРУЙТЕ</span><span>02 — АНАЛИЗИРУЙТЕ</span><span>03 — РАСТИТЕ</span></div>
        </div>
      </div>
      <button class="back-link" onclick={() => show('menu')}><span aria-hidden="true">←</span> Назад к разделам</button>
    </section>
  {/if}
</main>

<style>
  .screen {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: clamp(24px, 6vw, 80px);
  }
  .landing { width: 100%; }
  .page-section { position:fixed; inset:0; min-height:100svh; min-height:100dvh; visibility:hidden; opacity:0; pointer-events:none; overflow:auto; }
  /* No-JS fallback: first slide visible in plain CSS; JS/GSAP overrides via inline autoAlpha + .is-active */
  .page-section:first-of-type { visibility:visible; opacity:1; pointer-events:auto; }
  :global(.page-section.is-active) { visibility:visible; opacity:1; pointer-events:auto; }
  /* Animated at slide level (opacity/percent transforms) by GSAP */
  :global(.page-section) { will-change: transform, opacity; }
  :global([data-reveal]) { will-change: transform, opacity; }
  .story-section { position:fixed; isolation:isolate; display:block; padding:0; }
  .story-sticky { position:absolute; inset:0; display:grid; place-items:center; width:100%; height:100%; }
  .story-lines { position:relative; display:grid; place-items:center; width:min(100%,1100px); height:100%; margin:0 auto; padding:clamp(30px,7vw,100px); text-align:center; }
  .story-lines p { position:absolute; width:100%; margin:0; color:var(--ink); font-family:'Cormorant Garamond',Georgia,serif; font-size:clamp(3.4rem,8vw,8rem); font-weight:400; line-height:.98; letter-spacing:-.045em; text-wrap:balance; will-change:transform,opacity; }
  .slide-index { position:fixed; right:clamp(24px,6vw,80px); bottom:clamp(24px,6vw,80px); z-index:40; color:var(--ink-muted); font-size:.62rem; letter-spacing:.16em; }.slide-index i { margin:0 18px; color:var(--accent); font-style:normal; }.slide-index b { font-weight:400; color:var(--ink); }
  @media (prefers-reduced-motion: reduce) { .story-lines p { font-size:clamp(2rem,7vw,4rem); } }
  .hero { position: relative; display: grid; place-content: center; justify-items: center; gap: clamp(48px, 12vh, 112px); animation: reveal 900ms var(--ease-out) both; }
  .hero { display: grid; justify-items: center; gap: clamp(48px, 12vh, 112px); animation: reveal 900ms var(--ease-out) both; }
  .feature-section { position: fixed; inset: 0; isolation: isolate; display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: clamp(36px, 9vw, 140px); padding: clamp(70px, 12vh, 140px) clamp(24px, 10vw, 160px); overflow: visible; }
  .footer-slide { grid-template-columns: 1fr; justify-items: center; text-align: center; }.footer-slide .section-copy { max-width:720px; }.footer-slide .section-copy > p:not(.eyebrow) { margin-inline: auto; }.footer-links { display:flex; justify-content:center; flex-wrap:wrap; gap:22px; margin:34px 0 26px; }.footer-links button,.footer-links a { border:0; border-bottom:1px solid var(--accent); padding:10px 0; background:none; color:var(--ink); font:inherit; text-decoration:none; cursor:pointer; font-size:.75rem; letter-spacing:.1em; text-transform:uppercase; }.footer-links span { margin-left:16px; }.footer-slide small { color:var(--ink-muted); font-size:.56rem; letter-spacing:.14em; }
  .journal { border-top: 1px solid rgba(240,245,241,.12); }
  .glass-grain { position: absolute; z-index: -1; inset: 5% 4%; border: 1px solid rgba(235,244,239,.16); border-radius: 2px; background: rgba(224,238,228,.05); box-shadow: inset 0 1px rgba(255,255,255,.12), 0 22px 90px rgba(0,0,0,.12); backdrop-filter: blur(1.5px); pointer-events: none; }
  .glass-panel { border: 1px solid rgba(229,239,231,.22); border-radius: 3px; background: rgba(224,238,228,.06); box-shadow: inset 0 1px rgba(255,255,255,.16), inset 0 -1px rgba(157,174,202,.08), 0 26px 90px rgba(0,0,0,.16); backdrop-filter: blur(14px) saturate(1.25); }
  .section-copy { position: relative; max-width: 630px; }
  .section-copy .eyebrow { margin-bottom: 28px; }
  .section-copy h2 { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(3rem, 6.6vw, 6.8rem); font-weight: 400; letter-spacing: -.045em; line-height: .92; text-wrap: balance; }
  .section-copy h2 em { color: rgba(207,220,212,.72); font-weight: 400; }
  .section-copy > p:not(.eyebrow) { max-width: 470px; margin: 28px 0 30px; color: var(--ink-muted); font-size: clamp(.95rem, 1.3vw, 1.08rem); line-height: 1.8; }
  .text-link { display: inline-flex; gap: 24px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--accent); color: var(--ink); text-decoration: none; font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; }
  .text-link span { transition: transform 250ms var(--ease-out); }.text-link:hover span { transform: translate(4px,-3px); }
  .visual, .review-visual { position: relative; width: 100%; max-width: 560px; justify-self: end; padding: clamp(22px, 4vw, 48px); border: 1px solid rgba(239,247,241,.2); background: rgba(224,238,228,.06); box-shadow: inset 0 1px rgba(255,255,255,.16), 0 25px 70px rgba(0,0,0,.14); backdrop-filter: blur(2px); }
  .visual-label, .visual-foot, .chart-caption, .week { display:flex; justify-content:space-between; color:rgba(229,239,231,.67); font-size:.59rem; letter-spacing:.14em; }
  .visual-label { padding-bottom: 22px; border-bottom:1px solid rgba(255,255,255,.16); }.visual-label span { color:#b8d3c0; }
  .trade-row { display:grid; grid-template-columns:1fr 1.3fr auto; align-items:center; gap:10px; padding:20px 0; border-bottom:1px solid rgba(255,255,255,.12); font-size:.7rem; letter-spacing:.06em; }
  .trade-row b { color:var(--ink); font-weight:500; }.trade-row span { color:var(--ink-muted); }.trade-row strong { color:#c0d7c6; font-weight:400; }.trade-row.muted { opacity:.55; }
  .visual svg { display:block; width:100%; margin:22px 0; overflow:visible; }.visual-foot { padding-top:18px; border-top:1px solid rgba(255,255,255,.14); }.visual-foot span { font-size:1rem; }
  .review { grid-template-columns: .95fr 1.05fr; }.review-visual { justify-self:start; }.review-visual svg { width:100%; display:block; }.chart-caption { margin-top:24px; }.chart-caption span:last-child { color:#c8decf; }.chart-caption i { font-style:normal; }.week { margin-top:18px; opacity:.56; }
  .calendar-visual, .discipline-visual { position:relative; width:100%; max-width:520px; justify-self:end; padding:clamp(22px,4vw,42px); border:1px solid rgba(239,247,241,.2); background:rgba(224,238,228,.06); box-shadow:inset 0 1px rgba(255,255,255,.16),0 25px 70px rgba(0,0,0,.14); backdrop-filter:blur(2px); }
  .calendar-head { display:flex; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,.17); color:var(--ink); font-size:.67rem; letter-spacing:.14em; }
  .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; }.calendar-grid > span { padding:18px 0 12px; color:var(--ink-muted); font-size:.58rem; }.calendar-grid b { position:relative; padding:11px 0; color:rgba(241,245,240,.75); font-size:.72rem; font-weight:400; }.calendar-grid .day-muted { opacity:.3; }.calendar-grid .day-mark::after { content:''; position:absolute; left:50%; bottom:4px; width:4px; height:4px; border-radius:50%; background:#c2d9ca; transform:translateX(-50%); }.calendar-grid .day-mark i { position:absolute; inset:3px 7px; border:1px solid rgba(194,217,202,.42); border-radius:50%; }
  .calendar-note { display:grid; gap:10px; margin-top:17px; padding-top:19px; border-top:1px solid rgba(255,255,255,.14); }.calendar-note span { color:var(--ink-muted); font-size:.58rem; letter-spacing:.13em; }.calendar-note strong { color:var(--ink); font-size:.76rem; font-weight:400; }.calendar-note i { color:#c2d9ca; font-style:normal; }
  .discipline { grid-template-columns:.95fr 1.05fr; }.discipline-visual { justify-self:start; }.discipline-visual .visual-label { font-size:.57rem; }.progress-ring { position:relative; display:grid; place-items:center; width:190px; height:190px; margin:28px auto; }.progress-ring svg { position:absolute; inset:0; width:100%; transform:rotate(-90deg); }.progress-ring circle { fill:none; stroke:rgba(255,255,255,.12); stroke-width:1; }.progress-ring circle.progress { stroke:rgba(194,217,202,.82); stroke-width:2; stroke-dasharray:357.76 458.67; stroke-linecap:round; }.progress-ring div { display:grid; gap:6px; text-align:center; }.progress-ring strong { font-family:'Cormorant Garamond',Georgia,serif; font-size:3.3rem; font-weight:400; }.progress-ring span { color:var(--ink-muted); font-size:.52rem; line-height:1.5; letter-spacing:.14em; }.habit-line { display:flex; justify-content:space-between; padding:13px 0; border-top:1px solid rgba(255,255,255,.12); color:var(--ink-muted); font-size:.68rem; }.habit-line b { color:var(--ink); font-weight:400; }
  .hero { display: grid; justify-items: center; gap: clamp(48px, 12vh, 112px); animation: reveal 900ms var(--ease-out) both; }
  .menu-trigger, .close, .back-link { color: var(--ink); font: inherit; cursor: pointer; background: transparent; border: 0; }
  .menu-trigger { position: fixed; top: clamp(48px, 9.5vh, 96px); right: clamp(40px, 9vw, 140px); z-index: 50; padding: 12px 4px; border: 0; border-bottom: 1px solid var(--accent); background: transparent; color: var(--ink-muted); font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; }
  .menu-trigger { transition: color 220ms ease, border-color 220ms ease, opacity 220ms ease; }
  .desktop-only-trigger-hidden { opacity: 0; pointer-events: none; }
  .menu-trigger:hover, .back-link:hover { color: var(--ink); }
  .menu-trigger span { margin-left: 12px; color: var(--ink); }
  .mobile-header { display: none; }
  .screen--panel { place-items: center; }
  .menu-panel, .about-panel { width: min(100%, 1040px); padding: clamp(24px, 5vw, 64px); border: 1px solid rgba(243,242,240,.22); background: rgba(12,15,17,.12); backdrop-filter: blur(2px); animation: panel-arrive 950ms var(--ease-out) both; }
  .panel-top { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 1px solid rgba(243,242,240,.24); }
  .eyebrow { margin: 0; color: var(--ink-muted); font-size: .68rem; letter-spacing: .2em; }
  .eyebrow span { margin-left: 10px; opacity: .72; }
  .close { width: 44px; height: 44px; font-size: 2rem; font-weight: 300; line-height: 1; }
  .menu-links { display: grid; margin: clamp(36px, 8vh, 88px) 0; }
  .menu-links a, .menu-links button { display: grid; grid-template-columns: 52px 1fr auto; align-items: baseline; gap: 12px; padding: 18px 0; color: var(--ink); text-decoration: none; text-align: left; font: inherit; font-size: clamp(1.65rem, 4.5vw, 3.8rem); letter-spacing: -.04em; background: transparent; border: 0; border-bottom: 1px solid rgba(243,242,240,.2); cursor: pointer; transition: color 220ms ease, padding 300ms var(--ease-out); }
  .menu-links a:hover, .menu-links button:hover { padding-left: 12px; color: #fff; }
  .index, .arrow { color: var(--ink-muted); font-size: .72rem; letter-spacing: .12em; }
  .panel-foot { margin: 0; color: var(--ink-muted); font-family: 'Cormorant Garamond', Georgia, serif; font-size: 1.4rem; font-style: italic; }
  .about-panel { width: min(100%, 1160px); }
  /* About top strip: brand left, close right — no label, no divider. */
  .about-topline { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .about-topline .close { flex: 0 0 auto; }
  .about-content { display: grid; grid-template-columns: 1fr; gap: 0; align-items: start; padding: clamp(20px, 4vh, 40px) 0 0; }
  .about-brand { align-self: start; }
  .about-brand :global(.brand) { flex-direction: row; align-items: center; gap: 12px; text-align: left; animation: none; }
  .about-brand :global(.brand__mark) { width: 34px; }
  .about-brand :global(.brand__name) { font-family: var(--font-display); font-size: 1rem; font-weight: 500; letter-spacing: .02em; white-space: nowrap; }
  .about-brand :global(.brand__tagline), .about-brand :global(.sr-only) { display: none; }
  .about-copy .eyebrow { margin-bottom: 22px; }
  .about-copy h1 { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(2.6rem, 6.5vw, 5.7rem); font-weight: 400; line-height: .95; letter-spacing: -.035em; text-wrap: balance; }
  .about-copy h1 em { color: var(--ink-muted); font-weight: 400; }
  .description { max-width: 510px; margin: 28px 0 34px; color: var(--ink-muted); font-size: clamp(.95rem, 1.3vw, 1.08rem); line-height: 1.75; }
  .about-meta { display: flex; flex-wrap: wrap; gap: 10px 24px; color: var(--ink); font-size: .62rem; letter-spacing: .13em; }
  .about-links { display: grid; margin: 0 0 36px; border-top: 1px solid rgba(243,242,240,.18); }
  .about-links a { display: grid; grid-template-columns: 48px 1fr auto; align-items: center; gap: 14px; padding: 18px 0; color: var(--ink); text-decoration: none; border-bottom: 1px solid rgba(243,242,240,.18); transition: padding 280ms var(--ease-out), color 200ms ease; }
  .about-links a:hover { padding-left: 10px; color: #fff; }
  .about-links a.about-app { color: var(--ink); }
  .about-links .res-index { font-size: .66rem; letter-spacing: .12em; color: var(--ink-muted); }
  .about-links .res-body { display: grid; gap: 3px; }
  .about-links .res-body b { font-weight: 400; font-size: clamp(1.1rem, 2.4vw, 1.5rem); letter-spacing: -.01em; }
  .about-links .res-body small { color: var(--ink-muted); font-size: .72rem; letter-spacing: .04em; }
  .about-links .res-arrow { font-size: 1.1rem; color: var(--ink-muted); transition: transform 250ms var(--ease-out); }
  .about-links a:hover .res-arrow { transform: translate(3px,-3px); color: var(--ink); }
  .back-link { padding: 0; color: var(--ink-muted); font-size: .8rem; letter-spacing: .08em; }
  .back-link span { margin-right: 8px; }
  @keyframes reveal { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes panel-arrive { from { opacity: 0; transform: translateY(26px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  :global(button:focus-visible), :global(a:focus-visible) { outline: 2px solid var(--ink); outline-offset: 5px; }
  @media (max-width: 640px) {
    .screen { padding: 18px; }
    .menu-panel, .about-panel { padding: 20px; }
    /* Tall panel views: scroll inside the glass panel instead of clipping at the viewport bottom. */
    .menu-panel, .about-panel {
      max-height: calc(100dvh - 36px);
      overflow-y: auto;
      overscroll-behavior: contain;
      -webkit-overflow-scrolling: touch;
    }
    .about-content { padding: 18px 0 0; }
    .about-copy h1 { font-size: clamp(2.6rem, 11vw, 4rem); }
    .description { margin: 22px 0 26px; }
    .about-meta { gap: 10px 14px; font-size: .55rem; }
    .description { margin: 18px 0 22px; }
    .about-links { margin-bottom: 22px; }
    .about-links a { padding: 14px 0; }
    .back-link { margin-top: 14px; }
    /* Top pad = header 61px + visible gap (~27px); bottom pad clears the counter. */
    .feature-section, .review, .discipline { grid-template-columns: 1fr; gap: 22px; padding: 88px 24px 82px; align-content: center; overflow-y: auto; }
    .visual, .review-visual { justify-self: center; padding: 14px 14px 10px; margin-bottom: 0; }
    .calendar-visual, .discipline-visual { justify-self: center; padding: 14px 14px 10px; margin-bottom: 0; }
    .section-copy .eyebrow { margin-bottom: 12px; }
    .section-copy h2 { font-size: clamp(2.3rem, 9.5vw, 3.4rem); }
    .section-copy > p:not(.eyebrow) { margin: 14px 0 16px; font-size: .92rem; line-height: 1.6; }
    /* Trade-log card (06): compress rows/labels so the card fits the viewport. */
    .visual--journal .visual-label { padding-bottom: 10px; }
    .trade-row { padding: 10px 0; }
    .visual svg { margin: 10px 0; }
    .visual-foot { padding-top: 10px; margin-bottom: 0; }
    /* Review chart card (07) and discipline card (09). */
    .review-visual svg { display: block; }
    .chart-caption { margin-top: 12px; }
    .week { margin-top: 10px; }
    .visual-label { padding-bottom: 10px; }
    /* Discipline card (09): ring shrunk + rows tightened to offset the
       larger top clearance from the fixed header. */
    .progress-ring { width: 156px; height: 156px; margin: 6px auto; }
    .progress-ring strong { font-size: 2.7rem; }
    .habit-line { padding: 6px 0; line-height: 1.35; }
    .discipline-visual .visual-label { padding-bottom: 8px; }
    /* Calendar card (08): tighter rows. */
    .calendar-head { padding-bottom: 10px; }
    .calendar-grid > span { padding: 8px 0 4px; }
    .calendar-grid b { padding: 6px 0; }
    .calendar-note { margin-top: 10px; padding-top: 10px; margin-bottom: 0; }
    /* SVG artwork scales inside its card: never wider than the card box. */
    .visual svg, .review-visual svg { width: 100%; height: auto; max-width: 100%; }
    /* Cards 07 & 09 only: equal SVG-to-inner-border side gaps. Card padding
       is symmetric (14px) ≈ the 3% side inset of the section frame at 488px
       (14.6px); SVG blocks are centered within the remaining inner width. */
    .review-visual, .discipline-visual { text-align: left; }
    .review-visual > svg, .discipline-visual .progress-ring { margin-left: auto; margin-right: auto; }
    .review-visual > svg { display: block; width: calc(100% - 0px); }
    .story-section { padding:0; }.story-lines { padding:28px; }.story-lines p { font-size:clamp(2.8rem,11vw,4rem); }
    /* Fixed header height as an inherited variable so every glass backdrop
       computes its top from the same source. */
    .screen { --header-h: 61px; }
    /* Glass frame on slides 06–09: use viewport width for every inset so the
       physical gap is equal on all sides; retain the mobile header clearance. */
    .glass-grain { inset: calc(var(--header-h, 0px) + 3vw) 3vw 3vw; }
    /* Compact header panel: logo/title + menu, pinned to the top (not shifted down). */
    .mobile-header {
      position: fixed; top: 0; left: 0; right: 0; z-index: 60;
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 18px;
      background: rgba(12,15,17,.14);
      border-bottom: 1px solid rgba(243,242,240,.18);
      backdrop-filter: blur(10px);
    }
    .mobile-header--hidden { opacity: 0; pointer-events: none; }
    .mobile-brand :global(.brand) { flex-direction: row; align-items: center; gap: 10px; animation: none; }
    .mobile-brand :global(.brand__mark) { width: 28px; }
    .mobile-brand :global(.brand__name) { font-family: var(--font-display); font-size: .95rem; font-weight: 500; letter-spacing: .02em; white-space: nowrap; }
    .mobile-brand :global(.brand__tagline), .mobile-brand :global(.sr-only) { display: none; }
    .mobile-menu-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 2px; border: 0; border-bottom: 1px solid var(--accent); background: transparent; color: var(--ink); font: inherit; font-size: .72rem; letter-spacing: .12em; text-transform: uppercase; cursor: pointer; }
    .desktop-only-trigger { display: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero, .menu-panel, .about-panel { animation: none; }
    .menu-trigger, .menu-links a, .menu-links button { transition: none; }
  }
  @media (max-width: 640px) and (max-height: 740px) { .feature-section { padding-top:80px; padding-bottom:76px; } .section-copy h2 { font-size:2.3rem; } .section-copy > p:not(.eyebrow) { margin:12px 0; line-height:1.5; } }
</style>
