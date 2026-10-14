import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { cpSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = __dirname;

// Ассеты лежат в корне проекта и пути к видео фиксированы
// (assets/shadows-loop-*). В dev Vite сам раздаёт файлы из корня, а при
// сборке плагин копирует в dist только реально используемые файлы,
// сохраняя исходные имена.
function copyStatic() {
  return {
    name: 'copy-static-roots',
    closeBundle() {
      const distAssets = resolve(root, 'dist', 'assets');
      mkdirSync(distAssets, { recursive: true });
      for (const file of readdirSync(resolve(root, 'assets'))) {
        if (/^shadows-loop-/.test(file)) {
          cpSync(resolve(root, 'assets', file), resolve(distAssets, file));
        }
      }
      cpSync(resolve(root, 'favicon.svg'), resolve(root, 'dist', 'favicon.svg'));
    },
  };
}

export default defineConfig({
  plugins: [svelte(), copyStatic()],
});
