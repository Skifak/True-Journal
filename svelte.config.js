import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** Runes выключены намеренно — как в основном проекте TradeJournal. */
export default {
  preprocess: vitePreprocess(),
  compilerOptions: { runes: false },
};
