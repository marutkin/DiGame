import Phaser from 'phaser';
import { JRPG, UI_FONT } from './JrpgPalette';
import { createJrpgWindowContainer, drawJrpgWindow } from './JrpgWindow';
import { TypewriterText } from './TypewriterText';
import { getSafeInsets } from './SafeInsets';

export interface DialoguePageView {
  speaker?: string;
  text: string;
}

export interface DialogueChoiceView {
  text: string;
}

type PageMode = 'advance' | 'close' | 'choices';

const PORTRAIT_COLORS: Record<string, number> = {
  'Старейшина': 0x886622,
  'Лесной дух': 0x338855,
  'Житель': 0x5080b0,
  'Табличка': 0x8a6a40,
  'Алтарь': 0xd8c060,
  '...': 0x444466,
  'Даша': 0xeeaacc,
  'Дима': 0x6699cc,
  'Плюша': 0xffbb99,
  'Злой Венгр': 0x664433,
  'Людмила Конюхова': 0x442233,
  'Записка от Димы': 0x8a6a40,
};

const SPEAKER_PORTRAITS: Record<string, string> = {
  'Даша': 'dasha_portrait',
  'Дима': 'dima_portrait',
  'Плюша': 'plusha_portrait',
  'Старейшина': 'dima_portrait',
  'Злой Венгр': 'enemy_common_portrait',
  'Людмила Конюхова': 'enemy_ludmila_portrait',
  'Записка от Димы': 'dima_portrait',
};

/**
 * Classic JRPG dialogue window: portrait, name plate, typewriter text,
 * blinking ▼ cursor, choice list with ▶ selector.
 */
export class DialogueBoxUI {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Rectangle;
  private typewriter!: TypewriterText;
  private promptCursor!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private choiceCursor!: Phaser.GameObjects.Text;
  private selectedChoice = 0;
  private blinkTween?: Phaser.Tweens.Tween;
  private inputHandlers: Array<{ event: string; fn: () => void }> = [];
  private active = false;
  private choices: DialogueChoiceView[] = [];

  private onAdvance?: () => void;
  private onClose?: () => void;
  private onChoice?: (index: number) => void;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isActive(): boolean {
    return this.active;
  }

  showPage(
    page: DialoguePageView,
    mode: PageMode,
    choices: DialogueChoiceView[] = [],
    callbacks: {
      onAdvance?: () => void;
      onClose?: () => void;
      onChoice?: (index: number) => void;
    } = {},
  ) {
    this.destroy();
    this.active = true;
    this.choices = choices;
    this.onAdvance = callbacks.onAdvance;
    this.onClose = callbacks.onClose;
    this.onChoice = callbacks.onChoice;
    this.selectedChoice = 0;

    const { width: vw, height: vh } = this.scene.scale;
    const { left, right, bottom } = getSafeInsets();
    const textLines = Math.ceil(page.text.length / 38);
    const boxH = mode === 'choices'
      ? Math.min(190, 72 + textLines * 14 + choices.length * 22)
      : 108;
    const boxW = vw - 24 - left - right;
    const boxX = 12 + left;
    const boxY = vh - boxH - 16 - bottom;

    this.root = this.scene.add.container(0, 0).setScrollFactor(0).setDepth(400);

    this.overlay = this.scene.add
      .rectangle(vw / 2, vh / 2, vw, vh, JRPG.overlay, 0.35)
      .setScrollFactor(0)
      .setDepth(399);
    this.root.add(this.overlay);

    const win = createJrpgWindowContainer(this.scene, boxX, boxY, boxW, boxH, 401);
    this.root.add(win);

    // Portrait frame
    const portraitSize = 64;
    const portraitX = boxX + 10;
    const portraitY = boxY + 10;
    const portraitGfx = this.scene.add.graphics()
      .setScrollFactor(0)
      .setDepth(410);
    drawJrpgWindow(portraitGfx, portraitX, portraitY, portraitSize, portraitSize);
    this.root.add(portraitGfx);

    const speakerColor = PORTRAIT_COLORS[page.speaker ?? ''] ?? 0x556688;

    // Use real portrait image from user_assets if available for this speaker
    const portraitKey = SPEAKER_PORTRAITS[page.speaker ?? ''];
    if (portraitKey && this.scene.textures.exists(portraitKey)) {
      const pImg = this.scene.add.image(
        portraitX + portraitSize / 2,
        portraitY + portraitSize / 2,
        portraitKey
      )
        .setDisplaySize(portraitSize - 16, portraitSize - 16)
        .setScrollFactor(0)
        .setDepth(410);
      this.root.add(pImg);
    } else {
      // Fallback generated face (colored bust)
      const face = this.scene.add.graphics()
        .setScrollFactor(0)
        .setDepth(410);
      face.fillStyle(speakerColor, 1);
      face.fillRect(portraitX + 8, portraitY + 8, portraitSize - 16, portraitSize - 16);
      face.fillStyle(0x000000, 0.25);
      face.fillRect(portraitX + 14, portraitY + 22, 10, 10);
      face.fillRect(portraitX + 36, portraitY + 22, 10, 10);
      face.fillRect(portraitX + 22, portraitY + 42, 20, 4);
      this.root.add(face);
    }

    // Name plate
    if (page.speaker) {
      const nameW = Math.max(90, page.speaker.length * 9 + 24);
      const nameGfx = this.scene.add.graphics()
        .setScrollFactor(0)
        .setDepth(410);
      drawJrpgWindow(nameGfx, portraitX + portraitSize + 8, portraitY, nameW, 22);
      this.root.add(nameGfx);
      const nameText = this.scene.add.text(portraitX + portraitSize + 16, portraitY + 4, page.speaker, {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: JRPG.textSpeaker,
        fontStyle: 'bold',
      }).setScrollFactor(0).setDepth(410);
      this.root.add(nameText);
    }

    const textX = portraitX + portraitSize + 12;
    const textY = boxY + (page.speaker ? 36 : 14);
    const textW = boxW - portraitSize - 36;

    this.typewriter = new TypewriterText(this.scene, {
      x: textX,
      y: textY,
      width: textW,
      fontSize: 13,
      color: JRPG.textMain,
    });
    const twObj = this.typewriter.getObject();
    twObj.setScrollFactor(0).setDepth(410);
    this.root.add(twObj);

    this.promptCursor = this.scene.add
      .text(boxX + boxW - 18, boxY + boxH - 16, '▼', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: JRPG.cursor,
      })
      .setOrigin(0.5)
      .setVisible(false)
      .setScrollFactor(0)
      .setDepth(410);
    this.root.add(this.promptCursor);

    if (mode === 'choices') {
      this.typewriter.start(page.text, () => {
        this.renderChoices(boxX, boxY, boxW, textY + page.text.length > 60 ? 72 : 52);
        this.setupChoiceInput();
      });
    } else {
      this.typewriter.start(page.text, () => {
        this.promptCursor.setVisible(true);
        this.blinkTween = this.scene.tweens.add({
          targets: this.promptCursor,
          alpha: 0.2,
          duration: 380,
          yoyo: true,
          repeat: -1,
        });
        this.bindInput(mode);
      });
    }
  }

  private renderChoices(boxX: number, _boxY: number, _boxW: number, startY: number) {
    this.choiceCursor = this.scene.add.text(boxX + 22, startY, '▶', {
      fontFamily: UI_FONT,
      fontSize: '13px',
      color: JRPG.cursor,
    }).setScrollFactor(0).setDepth(410);
    this.root.add(this.choiceCursor);

    this.choices.forEach((choice, i) => {
      const cy = startY + i * 22;
      const txt = this.scene.add
        .text(boxX + 40, cy, choice.text, {
          fontFamily: UI_FONT,
          fontSize: '13px',
          color: i === 0 ? JRPG.textChoiceActive : JRPG.textChoice,
        })
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(410);
      txt.on('pointerdown', () => {
        this.selectedChoice = i;
        this.updateChoiceHighlight();
        this.confirmChoice();
      });
      txt.on('pointerover', () => {
        this.selectedChoice = i;
        this.updateChoiceHighlight();
      });
      this.choiceTexts.push(txt);
      this.root.add(txt);
    });
    this.updateChoiceHighlight();
  }

  private updateChoiceHighlight() {
    this.choiceCursor.setY(this.choiceTexts[this.selectedChoice]?.y ?? this.choiceCursor.y);
    this.choiceTexts.forEach((t, i) => {
      t.setColor(i === this.selectedChoice ? JRPG.textChoiceActive : JRPG.textChoice);
    });
  }

  private setupChoiceInput() {
    this.bindKey('keydown-UP', () => {
      this.selectedChoice = (this.selectedChoice - 1 + this.choices.length) % this.choices.length;
      this.updateChoiceHighlight();
    });
    this.bindKey('keydown-DOWN', () => {
      this.selectedChoice = (this.selectedChoice + 1) % this.choices.length;
      this.updateChoiceHighlight();
    });
    this.bindKey('keydown-SPACE', () => this.confirmChoice());
    this.bindKey('keydown-ENTER', () => this.confirmChoice());
    ['ONE', 'TWO', 'THREE', 'FOUR'].forEach((key, i) => {
      if (i < this.choices.length) {
        this.bindKey(`keydown-${key}`, () => this.onChoice?.(i));
      }
    });
  }

  private confirmChoice() {
    this.onChoice?.(this.selectedChoice);
  }

  private bindInput(mode: PageMode) {
    const handler = () => {
      if (!this.typewriter.isComplete()) {
        this.typewriter.skip();
        return;
      }
      if (mode === 'advance') this.onAdvance?.();
      else this.onClose?.();
    };

    this.bindKey('keydown-SPACE', handler);
    this.bindKey('keydown-ENTER', handler);
    this.scene.input.once('pointerdown', handler);
  }

  private bindKey(event: string, fn: () => void) {
    this.scene.input.keyboard?.on(event, fn);
    this.inputHandlers.push({ event, fn });
  }

  getRoot(): Phaser.GameObjects.Container | undefined {
    return this.root;
  }

  destroy() {
    this.active = false;
    this.blinkTween?.stop();
    this.blinkTween = undefined;

    for (const h of this.inputHandlers) {
      this.scene.input.keyboard?.off(h.event, h.fn);
    }
    this.inputHandlers = [];

    this.typewriter?.destroy();
    this.choiceTexts = [];
    this.root?.destroy(true);
  }
}