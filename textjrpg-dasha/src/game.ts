/**
 * game.ts
 * Можно использовать для экспорта конфигурации или общих констант.
 * Сейчас вся конфигурация живёт в main.ts.
 */

export const GAME_WIDTH = 390;
export const GAME_HEIGHT = 844;

export const PARTY = ['dasha', 'dima', 'plusha'] as const;
export type PartyMember = typeof PARTY[number];
