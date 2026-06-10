/**
 * QuestSystem.ts
 * Простая система квестов / флагов прогресса.
 * В текущей версии состояние хранится в Phaser Registry + localStorage
 * (см. WorldScene и BootScene).
 * 
 * Этот класс можно расширять для более сложных квестов.
 */

export interface QuestFlags {
  questStarted: boolean;
  dimaJoined: boolean;
  plyushaJoined: boolean;
  enemiesDefeated: number;
  bossDefeated: boolean;
  gameFinished: boolean;
}

export class QuestSystem {
  private flags: QuestFlags;

  constructor(initial?: Partial<QuestFlags>) {
    this.flags = {
      questStarted: false,
      dimaJoined: false,
      plyushaJoined: false,
      enemiesDefeated: 0,
      bossDefeated: false,
      gameFinished: false,
      ...initial
    };
  }

  getFlags(): QuestFlags {
    return { ...this.flags };
  }

  setFlag<K extends keyof QuestFlags>(key: K, value: QuestFlags[K]): void {
    (this.flags as any)[key] = value;
  }

  incrementEnemies(): void {
    this.flags.enemiesDefeated++;
  }

  isComplete(): boolean {
    return this.flags.bossDefeated;
  }
}
