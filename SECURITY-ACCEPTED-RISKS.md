# Принятые риски безопасности (Security Accepted Risks)

Реестр уязвимостей, которые мы осознанно не устраняем. Каждая запись: пакет, почему не чинится, почему не опасно, условие перепроверки.

Правило: если для записи появился патч — риск снимается, обновляемся, запись удаляется.

## deepmerge 4.3.1 — GHSA-gcqx-w48m-w2h4 (CVE-2026-93753), low

- **Алерт:** Dependabot #1, `Skifak/True-Journal`, закрыт как `tolerable_risk` 2026-10-29.
- **Путь:** `package-lock.json` → `@sveltejs/vite-plugin-svelte` (dev) → `deepmerge`.
- **Уязвимость:** prototype poisoning в `mergeObject()` (CWE-1321).

### Почему не чинится

1. Патченной версии не существует: `deepmerge@4.3.1` — последняя в npm (`first_patched_version: null` в advisory), `npm audit fix` бессилен.
2. Обновление `@sveltejs/vite-plugin-svelte` до 7.3.1 не помогает — там остаётся `deepmerge: '^4.3.1'`.

### Почему не опасно

1. Зависимость только dev-time (`"dev": true` в lock-файле), в прод-бандл сайта не попадает.
2. Вектор атаки — слияние недоверенного объекта в `merge()`. Сборка сайта использует доверенный конфиг, недоверенный ввод в merge не подаётся.

### Что следить

- **Раз в месяц** (в Dependabot-рутине): проверить `npm view deepmerge version` и advisory GHSA-gcqx-w48m-w2h4 — не вышла ли версия > 4.3.1 или `first_patched_version`.
- Если патч появился — обновить lock-файл, снять dismiss, удалить запись из этого реестра.
