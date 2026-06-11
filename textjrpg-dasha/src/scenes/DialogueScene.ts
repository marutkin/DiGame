/**
 * DialogueScene.ts
 * 
 * Красивая диалоговая система в стиле классических JRPG.
 * - Портреты слева/справа
 * - Несколько строк текста с "печатью"
 * - Выборы (choices)
 * - Поддержка флагов и команд (startCombat и т.д.)
 * 
 * Запускается поверх WorldScene через scene.launch().
 */

import Phaser from 'phaser';

interface DialogueLine {
  text: string;
}

interface DialogueChoice {
  text: string;
  next: string;
}

interface Dialogue {
  id: string;
  speaker: string;
  portrait: string;
  lines: DialogueLine[];
  choices?: DialogueChoice[];
  end?: boolean;
  flags?: Record<string, any>;
}

interface DialogueData {
  version: number;
  dialogues: Record<string, Dialogue>;
}

export class DialogueScene extends Phaser.Scene {
  private dialogueId!: string;
  private onComplete!: (result?: any) => void;

  private dialogues!: DialogueData;
  private currentDialogue!: Dialogue;
  private currentLineIndex = 0;

  // UI элементы
  private panel!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private dialogueText!: Phaser.GameObjects.Text;
  private choiceButtons: Phaser.GameObjects.Text[] = [];

  private isPrinting = false;
  private fullText = '';
  private printedChars = 0;

  constructor() {
    super({ key: 'DialogueScene' });
  }

  init(data: { dialogueId: string; onComplete: (result?: any) => void }): void {
    this.dialogueId = data.dialogueId;
    this.onComplete = data.onComplete;
  }

  create(): void {
    this.dialogues = this.registry.get('dialogues') as DialogueData;

    const dialogue = this.dialogues.dialogues[this.dialogueId];
    if (!dialogue) {
      console.error(`Диалог не найден: ${this.dialogueId}`);
      this.finish();
      return;
    }
    this.currentDialogue = dialogue;
    this.currentLineIndex = 0;

    this.createUI();
    this.showCurrentLine();

    // Закрытие по ESC (на всякий случай)
    this.input.keyboard?.on('keydown-ESC', () => this.advance());
  }

  private createUI(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    // Затемнение фона
    this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(0);

    // Основная панель диалога (внизу)
    const panelY = h - 148;
    const panelHeight = 136;

    this.panel = this.add.graphics();
    this.panel.fillStyle(0x1a1423, 0.96);
    this.panel.fillRect(12, panelY, w - 24, panelHeight);
    this.panel.lineStyle(3, 0x8b7aa3, 0.9);
    this.panel.strokeRect(12, panelY, w - 24, panelHeight);
    this.panel.setDepth(10);
    this.panel.setScrollFactor(0);

    // Портрет (слева)
    const portraitKey = this.getPortraitKey(this.currentDialogue.portrait);
    this.portrait = this.add.image(72, panelY + 68, portraitKey)
      .setDisplaySize(92, 92)
      .setDepth(11)
      .setScrollFactor(0);

    // Если портрета нет — placeholder
    if (!this.textures.exists(portraitKey)) {
      this.portrait.setTexture('tile_wall'); // что угодно
      this.portrait.setDisplaySize(92, 92);
    }

    // Имя говорящего
    this.nameText = this.add.text(140, panelY + 12, this.currentDialogue.speaker, {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#e8d5b7',
      fontStyle: 'bold'
    }).setDepth(12).setScrollFactor(0);

    // Текст диалога
    this.dialogueText = this.add.text(140, panelY + 38, '', {
      fontFamily: 'monospace',
      fontSize: '13px',
      color: '#e8d5b7',
      wordWrap: { width: w - 170 }
    }).setDepth(12).setScrollFactor(0);

    // Инструкция "клик для продолжения"
    const hint = this.add.text(w - 30, panelY + panelHeight - 16, '▼', {
      fontSize: '12px',
      color: '#8b7aa3'
    }).setOrigin(1, 0.5).setDepth(12).setScrollFactor(0);

    this.tweens.add({
      targets: hint,
      y: '+=4',
      duration: 600,
      yoyo: true,
      repeat: -1
    });

    // Клик / тап по панели — продолжить
    this.panel.setInteractive(new Phaser.Geom.Rectangle(12, panelY, w - 24, panelHeight), Phaser.Geom.Rectangle.Contains);
    this.panel.on('pointerdown', () => this.advance());

    // Также можно кликать в любом месте экрана (кроме кнопок выбора)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Если клик не по кнопке выбора — продвигаем
      if (!this.choiceButtons.some(btn => btn.getBounds().contains(pointer.x, pointer.y))) {
        this.advance();
      }
    });
  }

  private getPortraitKey(portraitId: string): string {
    const map: Record<string, string> = {
      dasha: 'portrait_dasha',
      dima: 'portrait_dima',
      plusha: 'portrait_plusha',
      enemy_common: 'portrait_enemy',
      ludmila: 'portrait_ludmila'
    };
    return map[portraitId] || 'portrait_dasha';
  }

  private showCurrentLine(): void {
    this.clearChoices();

    const line = this.currentDialogue.lines[this.currentLineIndex];
    if (!line) {
      this.showChoicesOrEnd();
      return;
    }

    this.fullText = line.text;
    this.printedChars = 0;
    this.dialogueText.setText('');
    this.isPrinting = true;

    // Эффект печатания
    const printInterval = setInterval(() => {
      if (!this.isPrinting) {
        clearInterval(printInterval);
        return;
      }
      this.printedChars++;
      this.dialogueText.setText(this.fullText.substring(0, this.printedChars));

      if (this.printedChars >= this.fullText.length) {
        this.isPrinting = false;
        clearInterval(printInterval);
      }
    }, 28);
  }

  private advance(): void {
    if (this.isPrinting) {
      // Досрочно показать весь текст
      this.isPrinting = false;
      this.dialogueText.setText(this.fullText);
      return;
    }

    this.currentLineIndex++;

    if (this.currentLineIndex < this.currentDialogue.lines.length) {
      this.showCurrentLine();
    } else {
      this.showChoicesOrEnd();
    }
  }

  private showChoicesOrEnd(): void {
    this.clearChoices();

    const choices = this.currentDialogue.choices;

    if (choices && choices.length > 0) {
      // Показываем кнопки выбора
      const startY = this.scale.height - 148 + 92;

      choices.forEach((choice, index) => {
        const btn = this.add.text(140, startY + index * 26, `→ ${choice.text}`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#e8d5b7',
          backgroundColor: '#2a2233',
          padding: { x: 8, y: 4 }
        })
          .setDepth(20)
          .setScrollFactor(0)
          .setInteractive({ useHandCursor: true });

        btn.on('pointerdown', () => {
          this.selectChoice(choice.next);
        });

        this.choiceButtons.push(btn);
      });
    } else {
      // Нет выборов — просто заканчиваем диалог
      this.time.delayedCall(420, () => this.finish());
    }
  }

  private selectChoice(nextId: string): void {
    this.clearChoices();

    const nextDialogue = this.dialogues.dialogues[nextId];
    if (!nextDialogue) {
      this.finish();
      return;
    }

    this.currentDialogue = nextDialogue;
    this.currentLineIndex = 0;

    // Обновляем портрет и имя
    const newPortraitKey = this.getPortraitKey(this.currentDialogue.portrait);
    this.portrait.setTexture(newPortraitKey);
    this.nameText.setText(this.currentDialogue.speaker);

    this.showCurrentLine();
  }

  private clearChoices(): void {
    this.choiceButtons.forEach(b => b.destroy());
    this.choiceButtons = [];
  }

  private finish(): void {
    // Собираем результат (флаги и команды)
    const result: any = {};

    if (this.currentDialogue.flags) {
      if (this.currentDialogue.flags.startCombat) {
        result.startCombat = this.currentDialogue.flags.startCombat;
      }
      // Копируем все флаги из конечного узла (plyushaJoined, dimaJoined и т.д.)
      result.flags = { ...this.currentDialogue.flags };
    }

    // Передаём управление обратно
    if (this.onComplete) {
      this.onComplete({
        ...result,
        finalDialogueId: this.currentDialogue.id
      });
    }

    this.scene.stop();
  }
}
