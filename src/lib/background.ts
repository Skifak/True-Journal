/** Данные фоновой видеозаписи. Пути фиксированы — их нельзя переименовывать. */
export interface BackgroundSource {
  readonly src: string;
  readonly type: string;
}

export const BACKGROUND_SOURCES: readonly BackgroundSource[] = [
  { src: '/assets/shadows-loop-ohxjmG36.mp4', type: 'video/mp4' },
  { src: '/assets/shadows-loop-BNkFg5ea.webm', type: 'video/webm' },
] as const;
