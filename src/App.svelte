<script lang="ts">
  import { onMount } from 'svelte';
  import Lenis from 'lenis';
  import { gsap } from 'gsap';
  import Observer from 'gsap/Observer';
  import Background from './Background.svelte';
  import Logo from './Logo.svelte';
  import { BRAND } from './lib/brand';

  let view: 'home' | 'menu' | 'about' = 'home';
  let page: HTMLElement;
  let reduced = false;

  function show(next: 'home' | 'menu' | 'about'): void {
    view = next;
  }

  onMount(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = media.matches;
    gsap.registerPlugin(Observer);
    const lenis = new Lenis({ autoRaf: false, smoothWheel: true, syncTouch: true, anchors: true, prevent: (node) => !!node.closest('input, textarea, select, [contenteditable="true"]') });
    const story = page.querySelector<HTMLElement>('[data-story-section]');
    const storyLines = story ? [...story.querySelectorAll<HTMLElement>('[data-story-line]')] : [];
    const updateStory = (): void => {
      if (!story || reduced || !storyLines.length) return;
      const count = storyLines.length;
      const storyDistance = Math.max(1, story.offsetHeight - window.innerHeight);
      const progress = Math.max(0, Math.min(1, (window.scrollY - story.offsetTop) / storyDistance));
      const storyProgress = Math.max(0, Math.min(1, (progress - 0.2) / 0.8));
      storyLines.forEach((line, index) => {
        const position = storyProgress * count - index;
        const incoming = Math.max(0, Math.min(1, (position + 0.28) / 0.28));
        const outgoing = Math.max(0, Math.min(1, (1.3 - position) / 0.6));
        const opacity = Math.min(incoming, outgoing);
        gsap.set(line, { opacity, y: (1 - incoming) * 24 - (1 - outgoing) * (window.innerHeight * 0.62) });
      });
    };
    const svgElements = [...page.querySelectorAll<SVGSVGElement>('.visual svg, .review-visual svg, .progress-ring svg')];
    const svgPaths = svgElements.flatMap((svg) => [...svg.querySelectorAll<SVGGeometryElement>('path, circle')]);
    if (!reduced) {
      svgPaths.forEach((shape) => {
        if (typeof shape.getTotalLength !== 'function') return;
        const length = shape.getTotalLength();
        shape.style.strokeDasharray = `${length}`;
        shape.style.strokeDashoffset = `${length}`;
        shape.style.opacity = '0';
      });
    }
    const svgObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const shapes = [...entry.target.querySelectorAll<SVGGeometryElement>('path, circle')];
      if (!reduced) gsap.to(shapes, { strokeDashoffset: 0, opacity: 1, scale: 1, transformOrigin: 'center', duration: 1.35, stagger: 0.08, ease: 'power2.out', overwrite: true });
        else gsap.set(shapes, { clearProps: 'all' });
        svgObserver.unobserve(entry.target);
      }
    }, { threshold: 0.35 });
    svgElements.forEach((svg) => svgObserver.observe(svg));

    let sectionLocked = false;
    const sections = (): HTMLElement[] => [...page.querySelectorAll<HTMLElement>('[data-page-section]')];
    const currentSection = (items: HTMLElement[]): number => items.reduce((best, item, index) => Math.abs(item.getBoundingClientRect().top) < Math.abs(items[best].getBoundingClientRect().top) ? index : best, 0);
    const atBoundary = (section: HTMLElement, direction: number): boolean => {
      const top = section.offsetTop;
      const bottom = top + section.offsetHeight;
      return direction > 0 ? window.scrollY + window.innerHeight >= bottom - 3 : window.scrollY <= top + 3;
    };
    const moveSection = (direction: number): void => {
      if (reduced || sectionLocked || view !== 'home') return;
      const items = sections();
      const current = currentSection(items);
      const next = current + direction;
      if (next < 0 || next >= items.length || !atBoundary(items[current], direction)) return;
      sectionLocked = true;
      const target = items[next];
      const timeline = gsap.timeline({
        onComplete: () => { sectionLocked = false; },
      });
      timeline.fromTo(target.querySelectorAll('[data-reveal]'), { opacity: 0, y: direction > 0 ? 24 : -24 }, { opacity: 1, y: 0, duration: .8, stagger: .1, ease: 'power3.out', overwrite: true }, 0);
      lenis.scrollTo(target.offsetTop, { duration: .85, lock: true });
      window.setTimeout(() => { sectionLocked = false; }, 950);
    };
    const sectionObserver = reduced ? null : Observer.create({
      target: page,
      type: 'wheel,touch,pointer',
      tolerance: 18,
      lockAxis: true,
      preventDefault: false,
      onDown: () => moveSection(1),
      onUp: () => moveSection(-1),
    });
    updateStory();
    window.addEventListener('scroll', updateStory, { passive: true });
    window.addEventListener('resize', updateStory, { passive: true });
    const tick = (time: number): void => lenis.raf(time * 1000);
    gsap.ticker.add(tick); gsap.ticker.lagSmoothing(0);
    const motionChange = (event: MediaQueryListEvent): void => { reduced = event.matches; };
    media.addEventListener('change', motionChange);
    return () => { sectionObserver?.kill(); svgObserver.disconnect(); window.removeEventListener('scroll', updateStory); window.removeEventListener('resize', updateStory); media.removeEventListener('change', motionChange); gsap.ticker.remove(tick); lenis.destroy(); };
  });
</script>

<Background />

<main bind:this={page} class="screen" class:screen--panel={view !== 'home'}>
  {#if view === 'home'}
    <div class="landing">
      <section class="hero page-section" data-page-section aria-label="True Journal">
        <Logo brand={BRAND} />
        <button class="menu-trigger" onclick={() => show('menu')} aria-expanded="false">Открыть меню <span aria-hidden="true">↗</span></button>
        <span class="hero-index">01 <i></i> 05</span>
      </section>
      <section class="story-section page-section" data-page-section data-story-section aria-label="Что даёт торговый журнал">
        <div class="story-sticky">
          <div class="story-lines" aria-live="polite">
            <p data-story-line>Открытый исходный код</p>
            <p data-story-line>Возможность глубокого анализа твоих результатов</p>
            <p data-story-line>Добавь помощника — свяжи ИИ с твоим журналом</p>
            <p data-story-line>Обучающие материалы о рынках и трейдинге</p>
          </div>
          <span class="story-index" aria-hidden="true">TRUE JOURNAL <i>／</i> ПРИНЦИПЫ</span>
        </div>
      </section>
      <section class="feature-section page-section journal" data-page-section aria-labelledby="journal-title">
        <div class="glass-grain" aria-hidden="true"></div>
        <div class="section-copy" data-reveal><p class="eyebrow">01 ／ ФИКСИРУЙТЕ</p><h2 id="journal-title">Каждая сделка<br /><em>имеет значение.</em></h2><p>Записывайте входы, выходы и контекст решения. Личный торговый дневник помогает не терять детали и видеть за цифрами собственные привычки.</p><a href="mailto:hello@truejournal.ru" class="text-link">Начать вести журнал <span>↗</span></a></div>
        <div class="visual visual--journal" data-reveal aria-hidden="true"><div class="visual-label">TRADE LOG <span>● LIVE</span></div><div class="trade-row"><b>EUR / USD</b><span>BUY · 1.0842</span><strong>+1.8R</strong></div><div class="trade-row"><b>NASDAQ</b><span>SELL · 18,642</span><strong>+0.9R</strong></div><div class="trade-row muted"><b>GOLD</b><span>WAIT · наблюдение</span><strong>—</strong></div><svg viewBox="0 0 440 100"><path d="M0 72 C30 71 35 48 68 55 S103 79 135 48 175 43 198 56 229 30 258 39 290 65 315 37 351 45 377 20 410 35 440 9" fill="none" stroke="rgba(200,220,208,.8)" stroke-width="1.5"/><path d="M0 82H440" stroke="rgba(255,255,255,.14)"/></svg><div class="visual-foot">РЕШЕНИЕ · РИСК · РЕЗУЛЬТАТ <span>→</span></div></div>
        <span class="section-number">02 / 05</span>
      </section>
      <section class="feature-section page-section review" data-page-section aria-labelledby="review-title">
        <div class="glass-grain" aria-hidden="true"></div>
        <div class="review-visual" data-reveal aria-hidden="true"><svg viewBox="0 0 500 270"><defs><pattern id="grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="rgba(235,244,239,.12)" stroke-width="1"/></pattern></defs><rect width="500" height="270" fill="url(#grid)"/><path d="M18 218 C74 195 85 212 126 170 S186 176 215 132 265 154 300 93 350 124 384 75 442 94 482 29" fill="none" stroke="rgba(190,218,202,.86)" stroke-width="2"/><g fill="rgba(190,218,202,.8)"><circle cx="126" cy="170" r="3"/><circle cx="215" cy="132" r="3"/><circle cx="300" cy="93" r="3"/><circle cx="384" cy="75" r="3"/></g></svg><div class="chart-caption"><span>РИТМ НЕДЕЛИ</span><span>+12.4% <i>↗</i></span></div><div class="week"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span></div></div>
        <div class="section-copy" data-reveal><p class="eyebrow">02 ／ ПОНИМАЙТЕ</p><h2 id="review-title">Опыт становится<br /><em>вашим преимуществом.</em></h2><p>Аналитика, статистика и графики раскрывают, что работает именно у вас. Разбирайте день по горячим следам в календаре и превращайте наблюдения в следующий уверенный шаг.</p><a href="mailto:hello@truejournal.ru" class="text-link">Путь к ясным решениям <span>↗</span></a></div>
        <span class="section-number">03 / 05</span>
      </section>
      <section class="feature-section page-section calendar" data-page-section aria-labelledby="calendar-title">
        <div class="glass-grain" aria-hidden="true"></div><div class="section-copy" data-reveal><p class="eyebrow">03 ／ РАЗБИРАЙТЕ</p><h2 id="calendar-title">День за днём.<br /><em>Без белых пятен.</em></h2><p>Торговый календарь собирает сделки и заметки в цельную картину. Возвращайтесь к каждому дню, отмечайте состояние и находите решения, которые стоит повторить — или оставить в прошлом.</p><a href="mailto:hello@truejournal.ru" class="text-link">Разобрать свой ритм <span>↗</span></a></div>
        <div class="calendar-visual" data-reveal aria-hidden="true"><div class="calendar-head"><span>ОКТЯБРЬ 2026</span><span>←　→</span></div><div class="calendar-grid"><span>ПН</span><span>ВТ</span><span>СР</span><span>ЧТ</span><span>ПТ</span><span>СБ</span><span>ВС</span>{#each ['28','29','30','1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31','1'] as day, i}<b class:day-muted={i < 3 || i > 33} class:day-mark={['7','14','21','28'].includes(day) && i > 3}>{day}{#if ['7','14','21','28'].includes(day) && i > 3}<i></i>{/if}</b>{/each}</div><div class="calendar-note"><span>СР · 14 ОКТЯБРЯ</span><strong>3 сделки <i>·</i> дневной разбор сохранён</strong></div></div>
        <span class="section-number">04 / 05</span>
      </section>
      <section class="feature-section page-section discipline" data-page-section aria-labelledby="discipline-title">
        <div class="glass-grain" aria-hidden="true"></div><div class="discipline-visual" data-reveal aria-hidden="true"><div class="visual-label">ДИСЦИПЛИНА <span>ПОСЛЕДНИЕ 30 ДНЕЙ</span></div><div class="progress-ring"><svg viewBox="0 0 180 180"><circle cx="90" cy="90" r="73"/><circle class="progress" cx="90" cy="90" r="73"/></svg><div><strong>82%</strong><span>ПЛАНА<br />СОБЛЮДЕНО</span></div></div><div class="habit-line"><span>Риск в пределах плана</span><b>24 / 27</b></div><div class="habit-line"><span>Записаны причины входа</span><b>21 / 27</b></div><div class="habit-line"><span>Итог дня подведён</span><b>18 / 27</b></div><div class="visual-foot">ПОСЛЕДОВАТЕЛЬНОСТЬ ВАЖНЕЕ ИДЕАЛА <span>↗</span></div></div>
        <div class="section-copy" data-reveal><p class="eyebrow">04 ／ СОБЛЮДАЙТЕ</p><h2 id="discipline-title">Прогресс — это<br /><em>верность своему плану.</em></h2><p>Отслеживайте привычки и дисциплину вместе с результатом. Статистика помогает увидеть, где вы держитесь выбранного риска, а где пора изменить подход.</p><a href="mailto:hello@truejournal.ru" class="text-link">Двигаться осознанно <span>↗</span></a></div><span class="section-number">05 / 05</span>
      </section>
    </div>
  {:else if view === 'menu'}
    <section class="menu-panel" aria-label="Главное меню">
      <div class="panel-top"><p class="eyebrow">TRUE JOURNAL <span>／ 01</span></p><button class="close" onclick={() => show('home')} aria-label="Закрыть меню">×</button></div>
      <nav class="menu-links" aria-label="Разделы">
        <button onclick={() => show('about')}><span class="index">01</span>О журнале<span class="arrow">↗</span></button>
        <a href="mailto:hello@truejournal.ru"><span class="index">02</span>Связаться<span class="arrow">↗</span></a>
      </nav>
      <p class="panel-foot">Место для ясных решений.</p>
    </section>
  {:else}
    <section class="about-panel" aria-labelledby="about-title">
      <div class="panel-top"><p class="eyebrow">TRUE JOURNAL <span>／ О НАС</span></p><button class="close" onclick={() => show('menu')} aria-label="Назад в меню">×</button></div>
      <div class="about-content">
        <div class="about-brand"><Logo brand={{ name: 'True Journal', tagline: '' }} /></div>
        <div class="about-copy">
          <p class="eyebrow">ЖУРНАЛ ТРЕЙДЕРА</p>
          <h1 id="about-title">Торгуйте осознанно.<br /><em>Запоминайте главное.</em></h1>
          <p class="description">True Journal — личное пространство для торговых решений. Записывайте сделки, замечайте закономерности и превращайте опыт в понятную стратегию.</p>
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
  .page-section { min-height: 100svh; min-height: 100dvh; }
  .story-section { position:relative; isolation:isolate; display:block; min-height:400svh; overflow:visible; padding:0; }
  .story-section::before { content:''; position:absolute; z-index:-1; inset:-2px 0 auto; height:30vh; background:linear-gradient(to bottom,var(--bg),transparent); opacity:.72; pointer-events:none; }
  .story-sticky { position:sticky; top:0; display:grid; place-items:center; width:100%; height:100svh; min-height:100dvh; }
  .story-lines { position:relative; display:grid; place-items:center; width:min(100%,1100px); height:100%; margin:0 auto; padding:clamp(30px,7vw,100px); text-align:center; }
  .story-lines p { position:absolute; width:100%; margin:0; color:var(--ink); font-family:'Cormorant Garamond',Georgia,serif; font-size:clamp(3.4rem,8vw,8rem); font-weight:400; line-height:.98; letter-spacing:-.045em; text-wrap:balance; will-change:transform,opacity; }
  .story-index { position:absolute; right:clamp(24px,6vw,80px); bottom:30px; color:var(--ink-muted); font-size:.6rem; letter-spacing:.17em; }.story-index i { margin:0 8px; color:var(--accent); font-style:normal; }
  @media (prefers-reduced-motion: reduce) { .story-section { min-height:100svh; padding:clamp(30px,7vw,100px); }.story-sticky { position:relative; top:auto; height:auto; min-height:0; }.story-lines { display:flex; flex-direction:column; justify-content:center; gap:24px; height:auto; min-height:0; }.story-lines p { position:static; font-size:clamp(2rem,7vw,4rem); } }
  .hero { position: relative; display: grid; place-content: center; justify-items: center; gap: clamp(48px, 12vh, 112px); animation: reveal 900ms var(--ease-out) both; }
  .hero-index, .section-number { position: absolute; right: clamp(24px, 6vw, 80px); bottom: 30px; color: var(--ink-muted); font-size: .62rem; letter-spacing: .16em; }
  .hero-index i { display: inline-block; width: 36px; margin: 0 10px 3px; border-top: 1px solid var(--accent); }
  .feature-section { position: relative; isolation: isolate; display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: clamp(36px, 9vw, 140px); padding: clamp(70px, 12vh, 140px) clamp(24px, 10vw, 160px); overflow: visible; }
  .journal { border-top: 1px solid rgba(240,245,241,.12); }
  .journal::before, .calendar::before, .discipline::before { content: ''; position: absolute; z-index: -1; inset: -2px 0 auto; height: 30vh; background: linear-gradient(to bottom, var(--bg), transparent); opacity: .72; pointer-events: none; }
  .glass-grain { position: absolute; z-index: -1; inset: 5% 4%; border: 1px solid rgba(235,244,239,.16); border-radius: 2px; background: linear-gradient(128deg, rgba(221,238,228,.09), rgba(215,230,220,.015) 48%, rgba(220,238,230,.055)); box-shadow: inset 0 1px rgba(255,255,255,.12), 0 22px 90px rgba(0,0,0,.12); backdrop-filter: blur(1.5px); pointer-events: none; }
  .glass-grain::after { content: ''; position: absolute; inset: 0; opacity: .22; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.16'/%3E%3C/svg%3E"); }
  .section-copy { position: relative; max-width: 630px; }
  .section-copy .eyebrow { margin-bottom: 28px; }
  .section-copy h2 { margin: 0; font-family: 'Cormorant Garamond', Georgia, serif; font-size: clamp(3rem, 6.6vw, 6.8rem); font-weight: 400; letter-spacing: -.045em; line-height: .92; text-wrap: balance; }
  .section-copy h2 em { color: rgba(207,220,212,.72); font-weight: 400; }
  .section-copy > p:not(.eyebrow) { max-width: 470px; margin: 28px 0 30px; color: var(--ink-muted); font-size: clamp(.95rem, 1.3vw, 1.08rem); line-height: 1.8; }
  .text-link { display: inline-flex; gap: 24px; align-items: center; padding-bottom: 10px; border-bottom: 1px solid var(--accent); color: var(--ink); text-decoration: none; font-size: .78rem; letter-spacing: .1em; text-transform: uppercase; }
  .text-link span { transition: transform 250ms var(--ease-out); }.text-link:hover span { transform: translate(4px,-3px); }
  .visual, .review-visual { position: relative; width: 100%; max-width: 560px; justify-self: end; padding: clamp(22px, 4vw, 48px); border: 1px solid rgba(239,247,241,.2); background: linear-gradient(145deg, rgba(224,238,228,.12), rgba(224,238,228,.035) 55%, rgba(224,238,228,.075)); box-shadow: inset 0 1px rgba(255,255,255,.16), 0 25px 70px rgba(0,0,0,.14); backdrop-filter: blur(2px); }
  .visual-label, .visual-foot, .chart-caption, .week { display:flex; justify-content:space-between; color:rgba(229,239,231,.67); font-size:.59rem; letter-spacing:.14em; }
  .visual-label { padding-bottom: 22px; border-bottom:1px solid rgba(255,255,255,.16); }.visual-label span { color:#b8d3c0; }
  .trade-row { display:grid; grid-template-columns:1fr 1.3fr auto; align-items:center; gap:10px; padding:20px 0; border-bottom:1px solid rgba(255,255,255,.12); font-size:.7rem; letter-spacing:.06em; }
  .trade-row b { color:var(--ink); font-weight:500; }.trade-row span { color:var(--ink-muted); }.trade-row strong { color:#c0d7c6; font-weight:400; }.trade-row.muted { opacity:.55; }
  .visual svg { display:block; width:100%; margin:22px 0; overflow:visible; }.visual-foot { padding-top:18px; border-top:1px solid rgba(255,255,255,.14); }.visual-foot span { font-size:1rem; }
  .review { grid-template-columns: .95fr 1.05fr; }.review-visual { justify-self:start; }.review-visual svg { width:100%; display:block; }.chart-caption { margin-top:24px; }.chart-caption span:last-child { color:#c8decf; }.chart-caption i { font-style:normal; }.week { margin-top:18px; opacity:.56; }
  .calendar-visual, .discipline-visual { position:relative; width:100%; max-width:520px; justify-self:end; padding:clamp(22px,4vw,42px); border:1px solid rgba(239,247,241,.2); background:linear-gradient(145deg,rgba(224,238,228,.12),rgba(224,238,228,.035) 55%,rgba(224,238,228,.075)); box-shadow:inset 0 1px rgba(255,255,255,.16),0 25px 70px rgba(0,0,0,.14); backdrop-filter:blur(2px); }
  .calendar-head { display:flex; justify-content:space-between; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,.17); color:var(--ink); font-size:.67rem; letter-spacing:.14em; }
  .calendar-grid { display:grid; grid-template-columns:repeat(7,1fr); text-align:center; }.calendar-grid > span { padding:18px 0 12px; color:var(--ink-muted); font-size:.58rem; }.calendar-grid b { position:relative; padding:11px 0; color:rgba(241,245,240,.75); font-size:.72rem; font-weight:400; }.calendar-grid .day-muted { opacity:.3; }.calendar-grid .day-mark::after { content:''; position:absolute; left:50%; bottom:4px; width:4px; height:4px; border-radius:50%; background:#c2d9ca; transform:translateX(-50%); }.calendar-grid .day-mark i { position:absolute; inset:3px 7px; border:1px solid rgba(194,217,202,.42); border-radius:50%; }
  .calendar-note { display:grid; gap:10px; margin-top:17px; padding-top:19px; border-top:1px solid rgba(255,255,255,.14); }.calendar-note span { color:var(--ink-muted); font-size:.58rem; letter-spacing:.13em; }.calendar-note strong { color:var(--ink); font-size:.76rem; font-weight:400; }.calendar-note i { color:#c2d9ca; font-style:normal; }
  .discipline { grid-template-columns:.95fr 1.05fr; }.discipline-visual { justify-self:start; }.discipline-visual .visual-label { font-size:.57rem; }.progress-ring { position:relative; display:grid; place-items:center; width:190px; height:190px; margin:28px auto; }.progress-ring svg { position:absolute; inset:0; width:100%; transform:rotate(-90deg); }.progress-ring circle { fill:none; stroke:rgba(255,255,255,.12); stroke-width:1; }.progress-ring circle.progress { stroke:rgba(194,217,202,.82); stroke-width:2; stroke-dasharray:376 459; stroke-linecap:round; }.progress-ring div { display:grid; gap:6px; text-align:center; }.progress-ring strong { font-family:'Cormorant Garamond',Georgia,serif; font-size:3.3rem; font-weight:400; }.progress-ring span { color:var(--ink-muted); font-size:.52rem; line-height:1.5; letter-spacing:.14em; }.habit-line { display:flex; justify-content:space-between; padding:13px 0; border-top:1px solid rgba(255,255,255,.12); color:var(--ink-muted); font-size:.68rem; }.habit-line b { color:var(--ink); font-weight:400; }
  .section-number { z-index:1; }
  .hero { display: grid; justify-items: center; gap: clamp(48px, 12vh, 112px); animation: reveal 900ms var(--ease-out) both; }
  .menu-trigger, .close, .back-link { color: var(--ink); font: inherit; cursor: pointer; background: transparent; border: 0; }
  .menu-trigger { padding: 12px 4px; border-bottom: 1px solid var(--accent); color: var(--ink-muted); font-size: .8rem; letter-spacing: .12em; text-transform: uppercase; transition: color 220ms ease, border-color 220ms ease; }
  .menu-trigger:hover, .back-link:hover { color: var(--ink); }
  .menu-trigger span { margin-left: 12px; color: var(--ink); }
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
  .about-content { display: grid; grid-template-columns: minmax(170px, .7fr) 1.5fr; gap: clamp(30px, 8vw, 110px); align-items: center; padding: clamp(44px, 9vh, 100px) 0; }
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
  .back-link { padding: 0; color: var(--ink-muted); font-size: .8rem; letter-spacing: .08em; }
  .back-link span { margin-right: 8px; }
  @keyframes reveal { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes panel-arrive { from { opacity: 0; transform: translateY(26px) scale(.985); } to { opacity: 1; transform: translateY(0) scale(1); } }
  :global(button:focus-visible), :global(a:focus-visible) { outline: 2px solid var(--ink); outline-offset: 5px; }
  @media (max-width: 640px) {
    .screen { padding: 18px; }
    .menu-panel, .about-panel { padding: 20px; }
    .about-content { grid-template-columns: 1fr; gap: 32px; padding: 36px 0; }
    .about-brand { order: 0; }
    .about-copy { order: 1; }
    .about-copy h1 { font-size: clamp(2.6rem, 11vw, 4rem); }
    .description { margin: 22px 0 26px; }
    .about-meta { gap: 10px 14px; font-size: .55rem; }
    .feature-section, .review, .discipline { grid-template-columns: 1fr; gap: 34px; padding: 90px 28px 76px; align-content: center; }
    .section-copy h2 { font-size: clamp(3rem, 12vw, 4.5rem); }
    .visual, .review-visual { justify-self: center; padding:22px; }
    .calendar-visual, .discipline-visual { justify-self:center; padding:22px; }
    .section-number { right:28px; bottom:20px; }
    .story-section { padding:0; }.story-lines { padding:28px; }.story-lines p { font-size:clamp(2.8rem,11vw,4rem); }
    .glass-grain { inset: 4% 3%; }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero, .menu-panel, .about-panel { animation: none; }
    .menu-trigger, .menu-links a, .menu-links button { transition: none; }
  }
  @media (max-width: 640px) and (max-height: 740px) { .feature-section { padding-top:70px; padding-bottom:60px; } .section-copy h2 { font-size:2.8rem; } .section-copy > p:not(.eyebrow) { margin:16px 0; line-height:1.55; } }
</style>
