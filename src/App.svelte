<script lang="ts">
  import Background from './Background.svelte';
  import Logo from './Logo.svelte';
  import { BRAND } from './lib/brand';
</script>

<Background />

<main class="screen">
  <Logo brand={BRAND} />
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
</style>
