/** Данные логотипа True*Jornal. */
export interface Brand {
  readonly name: string;
  readonly tagline: string;
}

export const BRAND: Brand = {
  name: 'True Jornal',
  tagline: 'твой инструмент. твой ассистент. твой тыл.',
} as const;
