<script lang="ts">
  import type { Brand } from './lib/brand';

  /** Типизированные props с значениями по умолчанию. */
  export let brand: Brand = { name: 'TradeJournal', tagline: 'торговый журнал сделок' };
</script>

<h1 class="brand">
  <svg class="brand__mark" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
    <defs>
      <mask id="brand-mark-cutouts" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill="black" />
        <path d="M10 92 L10 66 L32 66 L32 48 L54 48 L54 30 L76 30 L76 12 L92 12 L92 92 Z" fill="white" />
        <path d="M24 86 V73 M46 86 V55 M68 86 V37" fill="none" stroke="black" stroke-width="4" stroke-linecap="butt" />
      </mask>
    </defs>
    <path d="M10 92 L10 66 L32 66 L32 48 L54 48 L54 30 L76 30 L76 12 L92 12 L92 92 Z" mask="url(#brand-mark-cutouts)" />
  </svg>
  <span class="brand__name">{brand.name}</span>
  <span class="brand__tagline">{brand.tagline}</span>
  <span class="sr-only">{brand.name} — {brand.tagline}</span>
</h1>

<style>
  .brand {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(16px, 3.5vw, 28px);
    text-align: center;
    animation: brand-in 1.4s var(--ease-out) both;
    max-width: 100%;
  }

  @keyframes brand-in {
    from {
      opacity: 0;
      transform: translateY(16px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  /* Лого-знак: полупрозрачный, фон просвечивает сквозь фигуру */
  .brand__mark {
    width: clamp(72px, 12vw, 120px);
    height: auto;
    opacity: 0.7;
    fill: rgba(243, 242, 240, 0.7);
    filter: drop-shadow(0 6px 24px rgba(0, 0, 0, 0.35));
  }

  /* Pale-leaf с прозрачностью: анимированный фон виден сквозь буквы */
  .brand__name {
    font-size: clamp(2.4rem, 6.2vw, 5rem);
    font-weight: 400;
    line-height: 0.98;
    letter-spacing: 0.015em;
    color: var(--ink);
    text-shadow: 0 2px 24px rgba(0, 0, 0, 0.3);
    font-kerning: normal;
    font-variant-ligatures: common-ligatures;
    text-wrap: balance;
    max-width: 100%;
    opacity: 0.7;
  }

  .brand__tagline {
    font-family: var(--font-display);
    font-size: clamp(1.1rem, 2.2vw, 1.4rem);
    line-height: 1.25;
    letter-spacing: 0.045em;
    font-weight: 400;
    text-transform: none;
    color: var(--ink-muted);
    max-width: 32ch;
    text-wrap: balance;
    opacity: 0.7;
  }

  @media (prefers-reduced-motion: reduce) {
    .brand {
      animation: none;
    }
  }
</style>
