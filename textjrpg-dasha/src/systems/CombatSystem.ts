/**
 * CombatSystem.ts
 * 
 * В текущей реализации вся боевая логика живёт внутри CombatScene.
 * Этот файл оставлен как место для выноса чистой боевой механики
 * (расчёт урона, статусы, очередь ходов) при желании рефакторить.
 */

export interface CombatStats {
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
}

export function calculateDamage(attacker: CombatStats, defender: CombatStats, multiplier = 1): number {
  const base = attacker.atk - Math.floor(defender.def * 0.55);
  return Math.max(1, Math.floor(base * multiplier));
}
