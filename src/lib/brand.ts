/** Данные логотипа TradeJournal. */
export interface Brand {
  readonly name: string;
  readonly tagline: string;
}

export const BRAND: Brand = {
  name: 'TradeJournal',
  tagline: 'торговый журнал сделок',
} as const;
