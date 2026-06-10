/**
 * Enemy.ts
 * Используется в основном в CombatScene.
 * В мире враги представлены триггерами.
 */
import Phaser from 'phaser';

export interface EnemyStats {
  id: string;
  name: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
}

export class Enemy {
  public stats: EnemyStats;
  public isAlive = true;

  constructor(stats: EnemyStats) {
    this.stats = stats;
  }

  takeDamage(amount: number): number {
    const dmg = Math.max(1, amount - this.stats.def);
    this.stats.hp = Math.max(0, this.stats.hp - dmg);
    if (this.stats.hp <= 0) this.isAlive = false;
    return dmg;
  }
}
