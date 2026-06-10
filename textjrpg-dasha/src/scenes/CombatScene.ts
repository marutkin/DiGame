/**
 * CombatScene.ts
 * 
 * Полноценная пошаговая JRPG-боевая система.
 * 
 * Особенности:
 * - Партия: Даша, Дима, Плюша (3 члена)
 * - Враги: 2-3 обычных "Венгра" или босс Людмила
 * - Классическое меню: Атака / Навык / Предметы / Защита
 * - Целеуказание
 * - Простая очередь ходов по Speed
 * - Анимации через full_body спрайты + tween'ы
 * - Возврат здоровья и предметов в мир
 */

import Phaser from 'phaser';

interface Combatant {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  atk: number;
  def: number;
  spd: number;
  isEnemy: boolean;
  spriteKey: string;     // ключ full_body текстуры
  isAlive: boolean;
}

interface BattleAction {
  actor: Combatant;
  type: 'attack' | 'skill' | 'item' | 'defend';
  target?: Combatant;
  itemKey?: string;
  skillName?: string;
}

export class CombatScene extends Phaser.Scene {
  private party: Combatant[] = [];
  private enemies: Combatant[] = [];
  private allCombatants: Combatant[] = [];

  private turnOrder: Combatant[] = [];
  private currentTurnIndex = 0;

  private isPlayerTurn = true;
  private awaitingTarget = false;
  private currentActionType: 'attack' | 'skill' | 'item' | 'defend' | null = null;

  private onVictory!: (data: { partyHP: any; items: any }) => void;
  private onDefeat!: () => void;

  // UI
  private menuContainer!: Phaser.GameObjects.Container;
  private logText!: Phaser.GameObjects.Text;
  private turnText!: Phaser.GameObjects.Text;   // Яркий индикатор чьей сейчас ход
  private activeMarker!: Phaser.GameObjects.Text; // ▶ для текущего ходящего
  private hpTexts: Map<string, Phaser.GameObjects.Text> = new Map();
  private enemySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private partySprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  private items: { healingPotion: number; energyDrink: number } = { healingPotion: 0, energyDrink: 0 };

  constructor() {
    super({ key: 'CombatScene' });
  }

  init(data: any): void {
    this.onVictory = data.onVictory;
    this.onDefeat = data.onDefeat;

    this.items = { ...data.items };

    // === Создаём партию ===
    this.createParty(data.partyHP);

    // === Создаём врагов ===
    const enemyType = data.enemyType || 'common';
    const count = data.enemyCount || 2;
    const isBoss = data.isBoss || false;

    this.createEnemies(enemyType, count, isBoss);
  }

  create(): void {
    // Полностью непрозрачный фон боя — чтобы мир (и следователи) не просвечивали
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x120e1a, 1)
      .setOrigin(0, 0)
      .setDepth(-100);

    this.createBattlefield();
    this.createUI();
    this.startBattle();
  }

  private createParty(startingHP: any): void {
    this.party = [
      {
        id: 'dasha',
        name: 'Даша',
        hp: startingHP.dasha,
        maxHp: 42,
        atk: 11,
        def: 5,
        spd: 9,
        isEnemy: false,
        spriteKey: 'full_dasha',
        isAlive: true
      },
      {
        id: 'dima',
        name: 'Дима',
        hp: startingHP.dima,
        maxHp: 38,
        atk: 8,
        def: 7,
        spd: 7,
        isEnemy: false,
        spriteKey: 'full_dima',
        isAlive: true
      },
      {
        id: 'plusha',
        name: 'Плюша',
        hp: startingHP.plusha,
        maxHp: 28,
        atk: 9,
        def: 4,
        spd: 12,
        isEnemy: false,
        spriteKey: 'full_plusha',
        isAlive: true
      }
    ];
  }

  private createEnemies(type: string, count: number, isBoss: boolean): void {
    this.enemies = [];

    if (isBoss) {
      this.enemies.push({
        id: 'ludmila',
        name: 'Людмила Конюхова',
        hp: 78,
        maxHp: 78,
        atk: 14,
        def: 8,
        spd: 8,
        isEnemy: true,
        spriteKey: 'full_ludmila',
        isAlive: true
      });
    } else {
      const names = ['Венгр', 'Венгр', 'Венгр'];
      for (let i = 0; i < count; i++) {
        this.enemies.push({
          id: `enemy_${i}`,
          name: names[i] || 'Венгр',
          hp: 22 + i * 2,
          maxHp: 22 + i * 2,
          atk: 7,
          def: 3,
          spd: 6 + i,
          isEnemy: true,
          spriteKey: 'full_enemy',
          isAlive: true
        });
      }
    }
  }

  private createBattlefield(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Полностью тёмный фон (чтобы не было каши)
    this.add.rectangle(w / 2, h / 2, w, h, 0x0f0a14, 1).setDepth(0);

    // "Поле боя" — более тёмная зона справа для врагов
    this.add.rectangle(w * 0.65, h * 0.42, w * 0.7, h * 0.72, 0x1a1423, 0.95).setDepth(1);

    // Простая разделительная линия
    this.add.line(0, 0, w * 0.38, 0, w * 0.38, h, 0x3a2f4a, 0.6).setDepth(2);

    // === ПАРТИЯ (слева, компактно внизу) ===
    // Сильно уменьшили, чтобы не были огромными и не перекрывали всё
    const partyStartX = 48;
    const partyBaseY = h * 0.82;   // максимально вниз
    const partySpacing = 42;       // очень плотная стопка для маленьких спрайтов

    this.party.forEach((member, i) => {
      const y = partyBaseY + i * partySpacing;

      const sprite = this.add.sprite(partyStartX, y, member.spriteKey);
      // Сильно уменьшаем в бою — чтобы не было "огромных" персонажей. Плюша (собака) ещё меньше.
      const targetH = (member.id === 'plusha') ? 20 : 30;
      const origH = sprite.height || 100;
      const origW = sprite.width || 60;
      const displayH = targetH;
      const displayW = origW * (displayH / origH);
      sprite.setDisplaySize(displayW, displayH);
      sprite.setOrigin(0.5, 0.9);
      sprite.setDepth(10 + i);

      this.partySprites.set(member.id, sprite);

      // Статус сбоку, маленький и близко (для крошечных спрайтов)
      const labelX = partyStartX + 22;
      const label = this.add.text(labelX, y - 10, member.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#f5e8c7',
        backgroundColor: '#1a1423',
        padding: { x: 2, y: 0 }
      }).setDepth(25);

      const hpText = this.add.text(labelX, y - 1, `${member.hp}/${member.maxHp}`, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#a8d070'
      }).setDepth(25);

      this.hpTexts.set(member.id, hpText);

      // Полоска HP — маленькая
      const barWidth = 26;
      const barBg = this.add.rectangle(labelX + 1, y + 6, barWidth, 2, 0x3a2a2a).setOrigin(0, 0.5).setDepth(24);
      const bar = this.add.rectangle(labelX + 1, y + 6, barWidth * (member.hp / member.maxHp), 2, 0x6ab04a).setOrigin(0, 0.5).setDepth(24);
      (hpText as any).hpBar = bar;
    });

    // === ВРАГИ (справа, выше и компактнее) ===
    const enemyStartX = w - 55;
    const enemyBaseY = h * 0.28;
    const enemySpacing = 55;

    this.enemies.forEach((enemy, i) => {
      const y = enemyBaseY + (i - (this.enemies.length - 1) / 2) * enemySpacing;

      const sprite = this.add.sprite(enemyStartX, y, enemy.spriteKey);
      const targetH = 40;   // маленькие, чтобы не огромные и не мешали
      const origH = sprite.height || 100;
      const origW = sprite.width || 60;
      const displayH = targetH;
      const displayW = origW * (displayH / origH);
      sprite.setDisplaySize(displayW, displayH);
      sprite.setOrigin(0.5, 0.85);
      sprite.setDepth(10);

      this.enemySprites.set(enemy.id, sprite);

      // Имя и HP врага — слева от него
      const label = this.add.text(enemyStartX - 30, y - 15, enemy.name, {
        fontFamily: 'monospace',
        fontSize: '8px',
        color: '#ffaaaa',
        backgroundColor: '#1a1423',
        padding: { x: 2, y: 0 }
      }).setOrigin(0.5).setDepth(25);

      const hpText = this.add.text(enemyStartX - 30, y + 1, `${enemy.hp}/${enemy.maxHp}`, {
        fontFamily: 'monospace',
        fontSize: '7px',
        color: '#ffaaaa'
      }).setOrigin(0.5).setDepth(25);

      this.hpTexts.set(enemy.id, hpText);

      // Полоска HP для врага
      const barWidth = 28;
      this.add.rectangle(enemyStartX - 44, y + 8, barWidth, 2, 0x3a2a2a).setOrigin(0, 0.5).setDepth(24);
      const bar = this.add.rectangle(enemyStartX - 44, y + 8, barWidth * (enemy.hp / enemy.maxHp), 2, 0xcc5555).setOrigin(0, 0.5).setDepth(24);
      (hpText as any).hpBar = bar;
    });
  }

  private createUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Панель меню (внизу)
    const menuY = h - 92;

    this.menuContainer = this.add.container(0, 0);

    // Фон меню
    const bg = this.add.graphics();
    bg.fillStyle(0x1a1423, 0.98);
    bg.fillRect(10, menuY, w - 20, 82);
    bg.lineStyle(2, 0x8b7aa3, 0.85);
    bg.strokeRect(10, menuY, w - 20, 82);
    this.menuContainer.add(bg);

    // Кнопки действий — крупные для тача, в стиле классических FF
    const actions = [
      { label: 'АТАКОВАТЬ', action: 'attack' },
      { label: 'НАВЫК', action: 'skill' },
      { label: 'ПРЕДМЕТ', action: 'item' },
      { label: 'ЗАЩИТИТЬСЯ', action: 'defend' }
    ];

    actions.forEach((act, i) => {
      const x = 20 + (i % 2) * 180;
      const y = menuY + 10 + Math.floor(i / 2) * 38;

      const btn = this.add.text(x, y, act.label, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#f5e8c7',
        backgroundColor: '#2f2438',
        padding: { x: 16, y: 9 }
      })
        .setInteractive({ useHandCursor: true })
        .setDepth(30);

      btn.on('pointerdown', () => {
        if (!this.isPlayerTurn || this.awaitingTarget) return;
        this.handleMenuAction(act.action as any);
      });

      this.menuContainer.add(btn);
    });

    // Чёткая верхняя панель статуса (в стиле старых JRPG)
    const topPanel = this.add.rectangle(w / 2, 28, w - 16, 52, 0x1a1423, 0.97);
    topPanel.setStrokeStyle(2, 0x5a4a7a);
    topPanel.setDepth(15);

    // Большой и понятный индикатор чьей сейчас ход
    this.turnText = this.add.text(w / 2, 14, 'ХОД', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffeb99',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(40);

    // Маркер активного персонажа (будет двигаться к тому, кто ходит)
    this.activeMarker = this.add.text(0, 0, '▶', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffeb99'
    }).setDepth(30);

    // Лог боя — короткий и читаемый
    this.logText = this.add.text(12, 38, 'Бой начинается...', {
      fontFamily: 'monospace',
      fontSize: '12px',
      color: '#e8d5b7',
      wordWrap: { width: w - 24 }
    }).setDepth(25);

    // Кнопка "Сбежать" (только против обычных врагов)
    const flee = this.add.text(w - 70, 14, 'СБЕЖАТЬ', {
      fontFamily: 'monospace', fontSize: '10px', color: '#ff9a9a'
    }).setInteractive().setDepth(30);

    flee.on('pointerdown', () => {
      if (this.enemies.some(e => e.id === 'ludmila')) {
        this.addLog('Против Людмилы не сбежать!');
        return;
      }
      this.addLog('Вы сбежали...');
      this.endBattle(false);
    });
  }

  private startBattle(): void {
    this.allCombatants = [...this.party, ...this.enemies].filter(c => c.isAlive);

    // Сортировка по скорости (убывание)
    this.turnOrder = [...this.allCombatants].sort((a, b) => b.spd - a.spd);
    this.currentTurnIndex = 0;

    this.addLog('Бой начался!');
    this.nextTurn();
  }

  private nextTurn(): void {
    // Убираем мёртвых
    this.turnOrder = this.turnOrder.filter(c => c.isAlive);

    if (this.turnOrder.length === 0) {
      this.checkBattleEnd();
      return;
    }

    if (this.currentTurnIndex >= this.turnOrder.length) {
      this.currentTurnIndex = 0;
    }

    const actor = this.turnOrder[this.currentTurnIndex];

    if (!actor.isAlive) {
      this.currentTurnIndex++;
      this.nextTurn();
      return;
    }

    this.highlightActiveActor(actor);

    // Обновляем большой индикатор хода — теперь сразу понятно, чья очередь
    const isPlayer = !actor.isEnemy;
    this.turnText.setText(isPlayer ? `ХОД: ${actor.name.toUpperCase()}` : `ХОД: ${actor.name.toUpperCase()}`);
    this.turnText.setColor(isPlayer ? '#a8e8a0' : '#ff9a9a');

    if (!actor.isEnemy) {
      // Ход игрока — чистим возможные остатки выбора цели
      this.children.list
        .filter((c: any) => c.getData && c.getData('isTargetBtn'))
        .forEach((c: any) => c.destroy());

      this.isPlayerTurn = true;
      this.awaitingTarget = false;
      this.currentActionType = null;
      this.menuContainer.setVisible(true);
      this.addLog(`${actor.name} — ваш ход`);
    } else {
      // Ход врага — автоматический
      this.isPlayerTurn = false;
      this.addLog(`${actor.name} атакует...`);
      this.time.delayedCall(420, () => {
        this.enemyTurn(actor);
      });
    }
  }

  private highlightActiveActor(actor: Combatant): void {
    const allSprites = [...this.partySprites.values(), ...this.enemySprites.values()];
    allSprites.forEach(s => {
      s.clearTint();
      if (s.scaleX > 1) s.setScale(1);
    });

    // Скрываем маркер по умолчанию
    if (this.activeMarker) this.activeMarker.setVisible(false);

    const sprite = this.partySprites.get(actor.id) || this.enemySprites.get(actor.id);
    if (sprite && actor.isAlive) {
      // Постоянная заметная подсветка текущего ходящего
      sprite.setTint(0xffffaa);
      sprite.setScale(1.08);

      // Небольшая пульсация
      this.tweens.add({
        targets: sprite,
        scaleX: 1.13,
        scaleY: 1.13,
        duration: 380,
        yoyo: true,
        repeat: 1
      });

      // Показываем маркер ▶ только для своих (слева от маленького спрайта)
      if (!actor.isEnemy) {
        this.activeMarker.setPosition(18, sprite.y - 2);
        this.activeMarker.setVisible(true);
      }
    }
  }

  private handleMenuAction(action: 'attack' | 'skill' | 'item' | 'defend'): void {
    const actor = this.turnOrder[this.currentTurnIndex];
    if (!actor || actor.isEnemy) return;

    this.currentActionType = action;

    if (action === 'attack') {
      this.awaitingTarget = true;
      this.addLog('Выберите цель для атаки');
      this.enableTargetSelection(actor, 'attack');
    } else if (action === 'skill') {
      this.showSkillMenu(actor);
    } else if (action === 'item') {
      this.showItemMenu(actor);
    } else if (action === 'defend') {
      this.performDefend(actor);
    }
  }

  private showSkillMenu(actor: Combatant): void {
    // Простые уникальные навыки
    const skills: Record<string, string[]> = {
      dasha: ['Мощный удар'],
      dima: ['Воодушевление'],
      plusha: ['Укус', 'Увернуться']
    };

    const list = skills[actor.id] || ['Атака'];
    this.addLog('Навык:');

    const yBase = this.scale.height - 140;

    list.forEach((skill, i) => {
      const btn = this.add.text(140, yBase + i * 24, `• ${skill}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#a8e8ff',
        backgroundColor: '#222a3a', padding: { x: 8, y: 3 }
      }).setInteractive().setDepth(50);

      btn.on('pointerdown', () => {
        btn.destroy();
        list.forEach((_, j) => { /* cleanup */ });
        this.performSkill(actor, skill);
      });
    });
  }

  private performSkill(actor: Combatant, skill: string): void {
    this.menuContainer.setVisible(false);

    if (skill === 'Мощный удар') {
      const target = this.getFirstAliveEnemy();
      if (target) {
        const dmg = Math.floor(actor.atk * 1.65) - target.def;
        this.attackTarget(actor, target, Math.max(6, dmg), true);
      }
    } else if (skill === 'Воодушевление') {
      this.addLog(`${actor.name} воодушевляет партию!`);
      this.party.forEach(p => {
        if (p.isAlive) p.atk = Math.floor(p.atk * 1.25);
      });
      this.nextActorTurn();
    } else if (skill === 'Укус') {
      const target = this.getFirstAliveEnemy();
      if (target) this.attackTarget(actor, target, actor.atk + 4, true);
    } else if (skill === 'Увернуться') {
      this.addLog('Плюша готовится увернуться!');
      actor.def = Math.floor(actor.def * 1.8);
      this.nextActorTurn();
    } else {
      this.nextActorTurn();
    }
  }

  private showItemMenu(actor: Combatant): void {
    const yBase = this.scale.height - 140;
    const options: { label: string; key: string }[] = [];

    if (this.items.healingPotion > 0) options.push({ label: `Зелье HP (${this.items.healingPotion})`, key: 'healingPotion' });
    if (this.items.energyDrink > 0) options.push({ label: `Энергетик (${this.items.energyDrink})`, key: 'energyDrink' });

    if (options.length === 0) {
      this.addLog('Нет предметов!');
      return;
    }

    options.forEach((opt, i) => {
      const btn = this.add.text(140, yBase + i * 24, `• ${opt.label}`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#a3e8a3'
      }).setInteractive().setDepth(50);

      btn.on('pointerdown', () => {
        this.useItem(actor, opt.key);
        btn.destroy();
      });
    });
  }

  private useItem(actor: Combatant, key: string): void {
    this.menuContainer.setVisible(false);

    if (key === 'healingPotion' && this.items.healingPotion > 0) {
      this.items.healingPotion--;
      const heal = 18;
      actor.hp = Math.min(actor.maxHp, actor.hp + heal);
      this.addLog(`${actor.name} использует зелье (+${heal} HP)`);
      this.updateHPUI(actor);
    } else if (key === 'energyDrink' && this.items.energyDrink > 0) {
      this.items.energyDrink--;
      actor.spd = Math.floor(actor.spd * 1.3);
      this.addLog(`${actor.name} выпивает энергетик!`);
    }

    this.nextActorTurn();
  }

  private performDefend(actor: Combatant): void {
    this.addLog(`${actor.name} защищается.`);
    actor.def = Math.floor(actor.def * 1.6);
    this.nextActorTurn();
  }

  private enableTargetSelection(actor: Combatant, actionType: string): void {
    this.awaitingTarget = true;
    this.addLog('Выберите цель');

    const aliveEnemies = this.enemies.filter(e => e.isAlive);

    // Подсветка спрайтов (визуально)
    aliveEnemies.forEach((enemy) => {
      const sprite = this.enemySprites.get(enemy.id);
      if (sprite) {
        sprite.setTint(0xffdd66);
      }
    });

    // === Надёжные большие кнопки целей (критично для телефона) ===
    // В стиле старых FF — выбираешь цель из списка
    const yBase = this.scale.height - 155;

    aliveEnemies.forEach((enemy, i) => {
      const btn = this.add.text(160, yBase + i * 28, `> ${enemy.name}`, {
        fontFamily: 'monospace',
        fontSize: '16px',
        color: '#ffdd88',
        backgroundColor: '#3a2a1f',
        padding: { x: 14, y: 5 }
      })
        .setInteractive({ useHandCursor: true })
        .setDepth(60);

      const handler = () => {
        // Очистка
        aliveEnemies.forEach(e => {
          const s = this.enemySprites.get(e.id);
          if (s) s.clearTint();
        });
        // Удаляем все кнопки выбора цели
        this.children.list.filter((c: any) => c.getData && c.getData('isTargetBtn')).forEach((c: any) => c.destroy());

        this.performAttack(actor, enemy);
      };

      btn.setData('isTargetBtn', true);
      btn.on('pointerdown', handler);
    });

    // Кнопка Отмена — чтобы можно было передумать
    const cancelBtn = this.add.text(20, yBase, 'ОТМЕНА', {
      fontFamily: 'monospace',
      fontSize: '14px',
      color: '#ccaaaa',
      backgroundColor: '#2a1f2a',
      padding: { x: 10, y: 5 }
    })
      .setInteractive()
      .setDepth(60)
      .setData('isTargetBtn', true);

    cancelBtn.on('pointerdown', () => {
      aliveEnemies.forEach(e => {
        const s = this.enemySprites.get(e.id);
        if (s) s.clearTint();
      });
      this.children.list.filter((c: any) => c.getData && c.getData('isTargetBtn')).forEach((c: any) => c.destroy());

      this.awaitingTarget = false;
      this.menuContainer.setVisible(true);
      this.addLog('Отменено');
    });
  }

  private performAttack(actor: Combatant, target: Combatant): void {
    this.awaitingTarget = false;
    this.menuContainer.setVisible(false);

    const dmg = Math.max(2, actor.atk - Math.floor(target.def * 0.6));

    // Небольшая пауза + сообщение, как в классических FF
    this.addLog(`${actor.name} атакует ${target.name}!`);
    this.time.delayedCall(180, () => {
      this.attackTarget(actor, target, dmg);
    });
  }

  private attackTarget(attacker: Combatant, target: Combatant, damage: number, isSkill = false): void {
    const sprite = this.enemySprites.get(target.id) || this.partySprites.get(target.id);

    // Анимация атаки
    if (sprite) {
      this.tweens.add({
        targets: sprite,
        x: sprite.x + (attacker.isEnemy ? -18 : 18),
        duration: 110,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
    }

    // Наносим урон
    target.hp = Math.max(0, target.hp - damage);
    this.addLog(`${attacker.name} ${isSkill ? 'использует навык на' : 'атакует'} ${target.name} (-${damage})`);
    this.updateHPUI(target);

    // Плавающие цифры урона — теперь понятно, сколько сняли
    this.showDamageNumber(target, damage, sprite);

    // Эффект получения урона
    if (sprite) {
      sprite.setTint(0xff6666);
      this.time.delayedCall(180, () => sprite.clearTint());
    }

    if (target.hp <= 0) {
      target.isAlive = false;
      this.addLog(`${target.name} повержен!`);
      if (sprite) sprite.setAlpha(0.4);
    }

    // Даём время прочитать урон и анимацию, потом следующий ход (как в FF)
    this.time.delayedCall(650, () => {
      if (!this.checkBattleEnd()) {
        this.nextActorTurn();
      }
    });
  }

  private enemyTurn(enemy: Combatant): void {
    const aliveParty = this.party.filter(p => p.isAlive);
    if (aliveParty.length === 0) {
      this.checkBattleEnd();
      return;
    }

    // ИИ: атакуют Плюшу в последнюю очередь.
    // Сначала выбираем цель среди не-Плюши (самого слабого по HP).
    let target = aliveParty
      .filter(p => p.id !== 'plusha')
      .sort((a, b) => a.hp - b.hp)[0];

    // Если все кроме Плюши мертвы — тогда бьём Плюшу
    if (!target) {
      target = aliveParty.sort((a, b) => a.hp - b.hp)[0];
    }

    const dmg = Math.max(2, enemy.atk - Math.floor(target.def * 0.5));
    this.attackTarget(enemy, target, dmg);

    // После атаки врага возвращаем нормальную защиту (если была повышена)
    if (target) {
      target.def = Math.floor(target.maxHp * 0.12 + 4);
    }
  }

  private nextActorTurn(): void {
    this.menuContainer.setVisible(true);
    this.currentTurnIndex++;
    this.nextTurn();
  }

  private updateHPUI(combatant: Combatant): void {
    const txt = this.hpTexts.get(combatant.id);
    if (txt) {
      txt.setText(`${Math.max(0, combatant.hp)}/${combatant.maxHp}`);
      if (combatant.hp / combatant.maxHp < 0.3) {
        txt.setColor('#ff6b6b');
      }
      // Обновляем полоску HP
      const bar = (txt as any).hpBar;
      if (bar) {
        const fullWidth = 42;
        bar.width = fullWidth * Math.max(0, combatant.hp / combatant.maxHp);
        if (combatant.hp / combatant.maxHp < 0.3) {
          bar.fillColor = 0xcc4444;
        } else {
          bar.fillColor = 0x6ab04a;
        }
      }
    }
  }

  private addLog(message: string): void {
    this.logText.setText(message);
  }

  /**
   * Показывает плавающее число урона над целью.
   * Это сильно улучшает понимание, что происходит в бою.
   */
  private showDamageNumber(target: Combatant, damage: number, sprite?: Phaser.GameObjects.Sprite): void {
    if (!sprite) return;

    const dmgText = this.add.text(
      sprite.x + (target.isEnemy ? -10 : 10),
      sprite.y - 32,
      `-${damage}`,
      {
        fontFamily: 'monospace',
        fontSize: target.isEnemy ? '15px' : '14px',
        color: target.isEnemy ? '#ff6666' : '#ffaa66',
        fontStyle: 'bold',
        stroke: '#1a1423',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(50);

    // Улетает вверх и исчезает
    this.tweens.add({
      targets: dmgText,
      y: dmgText.y - 28,
      alpha: 0,
      duration: 620,
      ease: 'Cubic.easeOut',
      onComplete: () => dmgText.destroy()
    });
  }

  private getFirstAliveEnemy(): Combatant | null {
    return this.enemies.find(e => e.isAlive) || null;
  }

  private checkBattleEnd(): boolean {
    const aliveParty = this.party.filter(p => p.isAlive).length;
    const aliveEnemies = this.enemies.filter(e => e.isAlive).length;

    if (aliveParty === 0) {
      this.addLog('Партия пала...');
      this.time.delayedCall(900, () => this.endBattle(false));
      return true;
    }

    if (aliveEnemies === 0) {
      this.addLog('Победа!');
      this.time.delayedCall(650, () => this.endBattle(true));
      return true;
    }
    return false;
  }

  private endBattle(victory: boolean): void {
    // Возвращаем актуальные HP и предметы
    const partyHP = {
      dasha: this.party[0].hp,
      dima: this.party[1].hp,
      plusha: this.party[2].hp
    };

    if (victory) {
      this.onVictory({ partyHP, items: this.items });
    } else {
      this.onDefeat();
    }

    this.scene.stop();
  }
}
