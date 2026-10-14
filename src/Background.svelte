<script lang="ts">
  import { onMount } from 'svelte';
  import { BACKGROUND_SOURCES } from './lib/background';

  // Состояния фоновой видеозаписи: не начато / играет / не удалось загрузить.
  type VideoState = 'idle' | 'playing' | 'failed';

  let videoEl: HTMLVideoElement | undefined;
  let state: VideoState = 'idle';
  let sourceErrors = 0;

  const totalSources = BACKGROUND_SOURCES.length;

  /** Видео готово — проявляем поверх статичной подложки. */
  function onReady(): void {
    state = 'playing';
  }

  /** Ни один источник не загрузился — остаётся CSS-подложка. */
  function onSourceError(): void {
    sourceErrors += 1;
    if (sourceErrors >= totalSources) state = 'failed';
  }

  function onVideoError(): void {
    state = 'failed';
  }

  function kick(): void {
    if (!videoEl || state !== 'playing') return;
    const p = videoEl.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  }

  onMount(() => {
    // Страховка: если видео не готово за 6 секунд — считаем фон подложкой.
    const timer = window.setTimeout(() => {
      if (videoEl && videoEl.readyState < 2 && state === 'idle') state = 'failed';
    }, 6000);
    window.addEventListener('pointerdown', kick, { once: true });
    window.addEventListener('keydown', kick, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', kick);
      window.removeEventListener('keydown', kick);
    };
  });
</script>

<div class="bg" class:bg--video-on={state === 'playing'} class:bg--video-failed={state === 'failed'} aria-hidden="true">
  <div class="bg__fallback"></div>
  {#if state !== 'failed'}
    <video
      class="bg__video"
      bind:this={videoEl}
      autoplay
      muted
      loop
      playsinline
      preload="auto"
      tabindex="-1"
      on:loadeddata={onReady}
      on:error={onVideoError}
    >
      {#each BACKGROUND_SOURCES as source (source.src)}
        <source src={source.src} type={source.type} on:error={onSourceError} />
      {/each}
    </video>
  {/if}
  <div class="bg__veil"></div>
  <div class="bg__noise"></div>
</div>

<style>
  .bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    background: var(--bg);
  }

  /* Контрастная подложка: видна, пока видео не стартовало / если оно не загрузилось */
  .bg__fallback {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(120% 90% at 30% 20%, rgba(163, 164, 115, 0.08), transparent 60%),
      radial-gradient(100% 80% at 75% 85%, rgba(93, 150, 103, 0.1), transparent 55%),
      linear-gradient(160deg, #0d1710 0%, #0a120d 55%, #101d13 100%);
  }

  .bg__video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0;
    transition: opacity 1.2s var(--ease-out);
    /* Мягкие рассеянные края вместо пиксельной резкости:
       blur сглаживает фактуру, scale компенсирует светлые кромки */
    filter: blur(7px) saturate(0.92);
    transform: scale(1.07);
    transform-origin: center;
    will-change: filter, transform;
  }

  .bg--video-on .bg__video {
    opacity: 1;
  }

  .bg--video-failed .bg__video {
    display: none;
  }

  /* Глубокое почти чёрно-зелёное затемнение: светлые области гаснут,
     тени остаются читаемыми. Сам логотип не затрагивает. */
  .bg__veil {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(120% 100% at 50% 42%, transparent 0%, rgba(5, 10, 7, 0.28) 100%),
      var(--veil);
  }

  /* Процедурный noise: статичный 256px tile, ~3% alpha, под тени видео */
  .bg__noise {
    position: absolute;
    inset: 0;
    background: var(--noise-tile) repeat;
    background-size: 256px 256px;
    opacity: 0.03;
    pointer-events: none;
    mix-blend-mode: overlay;
  }

  @media (prefers-reduced-motion: reduce) {
    .bg__video {
      display: none;
    }
  }
</style>
