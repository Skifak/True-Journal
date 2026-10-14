<script lang="ts">
  import Background from './Background.svelte';
  import Logo from './Logo.svelte';
  import { BRAND } from './lib/brand';

  let view: 'home' | 'menu' | 'about' = 'home';

  function show(next: 'home' | 'menu' | 'about'): void {
    view = next;
  }
</script>

<Background />

<main class="screen" class:screen--panel={view !== 'home'}>
  {#if view === 'home'}
    <section class="hero" aria-label="True Journal">
      <Logo brand={BRAND} />
      <button class="menu-trigger" onclick={() => show('menu')} aria-expanded="false">Открыть меню <span aria-hidden="true">↗</span></button>
    </section>
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
  }
  @media (prefers-reduced-motion: reduce) {
    .hero, .menu-panel, .about-panel { animation: none; }
    .menu-trigger, .menu-links a, .menu-links button { transition: none; }
  }
</style>
