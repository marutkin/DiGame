import Phaser from 'phaser';
import { JRPG, UI_FONT } from './JrpgPalette';
import { createJrpgWindowContainer } from './JrpgWindow';
import { TypewriterText } from './TypewriterText';

export type BattleCommand = 'attack' | 'defend' | 'item' | 'escape';

export interface BattleCommandOption {
  id: BattleCommand;
  label: string;
  enabled: boolean;
}

export interface PartyMemberView {
  name: string;
  hp: number;
  maxHp: number;
}

/**
 * Final Fantasy SNES-style battle presentation:
 * gradient arena, enemy sprite, command window, message box, HP bars.
 */
export class BattleUI {
  private scene: Phaser.Scene;
  private root!: Phaser.GameObjects.Container;

  private enemyContainer!: Phaser.GameObjects.Container;
  private enemyHpGfx!: Phaser.GameObjects.Graphics;
  private enemyNameText!: Phaser.GameObjects.Text;

  private commandContainer!: Phaser.GameObjects.Container;
  private commandCursor!: Phaser.GameObjects.Text;
  private commandTexts: Phaser.GameObjects.Text[] = [];
  private commandOptions: BattleCommandOption[] = [];
  private selectedCommand = 0;

  private messageBox!: Phaser.GameObjects.Container;
  private typewriter!: TypewriterText;
  private messagePrompt!: Phaser.GameObjects.Text;
  private blinkTween?: Phaser.Tweens.Tween;

  private partyContainer!: Phaser.GameObjects.Container;
  private playerHpGfx!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;

  private onCommandSelect?: (cmd: BattleCommand) => void;
  private onMessageAck?: () => void;
  private inputHandlers: Array<{ event: string; fn: () => void }> = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  build(enemyName: string, party: PartyMemberView[], enemySprite?: { sheet: string; frame: number }) {
    this.destroy();
    const { width: w, height: h } = this.scene.scale;

    this.root = this.scene.add.container(0, 0).setDepth(100);

    this.drawArena(w, h);
    this.createEnemyDisplay(w, h, enemyName, enemySprite);
    this.createPartyPanel(w, h, party);
    this.createCommandWindow(w, h);
    this.createMessageWindow(w, h);

    this.commandContainer.setVisible(false);
    this.messageBox.setVisible(true);
  }

  private drawArena(w: number, h: number) {
    const arenaH = Math.floor(h * 0.58);
    const gfx = this.scene.add.graphics();

    // Sky gradient bands
    const bands = 8;
    for (let i = 0; i < bands; i++) {
      // band index drives gradient interpolation
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(JRPG.battleSkyTop),
        Phaser.Display.Color.IntegerToColor(JRPG.battleSkyBottom),
        bands,
        i,
      );
      gfx.fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 1);
      gfx.fillRect(0, (arenaH / bands) * i, w, arenaH / bands + 1);
    }

    // Ground
    gfx.fillStyle(JRPG.battleGround, 1);
    gfx.fillRect(0, arenaH - 28, w, 28);
    gfx.fillStyle(0x1a3818, 0.5);
    for (let i = 0; i < w; i += 18) {
      gfx.fillRect(i, arenaH - 20, 10, 4);
    }

    // Horizon line
    gfx.lineStyle(2, 0x88aacc, 0.4);
    gfx.lineBetween(0, arenaH - 28, w, arenaH - 28);

    this.root.add(gfx);
  }

  private createEnemyDisplay(
    w: number,
    h: number,
    enemyName: string,
    enemySprite?: { sheet?: string; frame?: number; key?: string; texture?: string },
  ) {
    const arenaH = Math.floor(h * 0.58);
    const cx = w * 0.62;
    const cy = arenaH * 0.48;

    this.enemyContainer = this.scene.add.container(cx, cy);

    const platform = this.scene.add.graphics();
    platform.fillStyle(0x000000, 0.25);
    platform.fillEllipse(0, 38, 90, 18);
    this.enemyContainer.add(platform);

    if (enemySprite) {
      const texKey = enemySprite.key || enemySprite.texture || enemySprite.sheet;
      if (texKey) {
        const fr = enemySprite.frame;
        const spr = (fr !== undefined)
          ? this.scene.add.sprite(0, -4, texKey, fr)
          : this.scene.add.sprite(0, -4, texKey);
        spr.setScale(2.5);
        this.enemyContainer.add(spr);
      } else {
        const body = this.scene.add.graphics();
        body.fillStyle(JRPG.enemyGlow, 0.25);
        body.fillCircle(0, -8, 36);
        body.fillStyle(0x44aa88, 1);
        body.fillCircle(0, -8, 22);
        this.enemyContainer.add(body);
      }
    } else {
      const body = this.scene.add.graphics();
      body.fillStyle(JRPG.enemyGlow, 0.25);
      body.fillCircle(0, -8, 36);
      body.fillStyle(0x44aa88, 1);
      body.fillCircle(0, -8, 22);
      this.enemyContainer.add(body);
    }

    this.enemyNameText = this.scene.add
      .text(0, -52, enemyName, {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: '#ffe8a0',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.enemyHpGfx = this.scene.add.graphics();
    this.enemyContainer.add([this.enemyNameText, this.enemyHpGfx]);
    this.root.add(this.enemyContainer);
  }

  private createPartyPanel(w: number, h: number, party: PartyMemberView[]) {
    const panelW = 168;
    const panelH = 56;
    const panelX = w - panelW - 10;
    const panelY = Math.floor(h * 0.58) - panelH - 6;

    this.partyContainer = createJrpgWindowContainer(this.scene, panelX, panelY, panelW, panelH, 110);
    this.root.add(this.partyContainer);

    const member = party[0];
    this.scene.add
      .text(panelX + 10, panelY + 8, member.name, {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: JRPG.textSpeaker,
        fontStyle: 'bold',
      })
      .setDepth(111);

    this.playerHpText = this.scene.add
      .text(panelX + 10, panelY + 26, `HP ${member.hp}/${member.maxHp}`, {
        fontFamily: UI_FONT,
        fontSize: '11px',
        color: JRPG.textMain,
      })
      .setDepth(111);

    this.playerHpGfx = this.scene.add.graphics().setDepth(111);
    this.drawHpBar(this.playerHpGfx, panelX + 10, panelY + 40, panelW - 20, 8, member.hp, member.maxHp);
    this.root.add([this.playerHpText, this.playerHpGfx]);
  }

  private createCommandWindow(_w: number, h: number) {
    const cmdW = 148;
    const cmdH = 108;
    const cmdX = 10;
    const cmdY = h - cmdH - 10;

    this.commandContainer = createJrpgWindowContainer(this.scene, cmdX, cmdY, cmdW, cmdH, 120);
    this.root.add(this.commandContainer);

    this.commandCursor = this.scene.add
      .text(cmdX + 14, cmdY + 14, '▶', {
        fontFamily: UI_FONT,
        fontSize: '13px',
        color: JRPG.cursor,
      })
      .setDepth(121);

    this.root.add(this.commandCursor);
  }

  private createMessageWindow(w: number, h: number) {
    const msgH = 72;
    const msgW = w - 20;
    const msgX = 10;
    const msgY = h - msgH - 10;

    this.messageBox = createJrpgWindowContainer(this.scene, msgX, msgY, msgW, msgH, 130);
    this.root.add(this.messageBox);

    this.typewriter = new TypewriterText(this.scene, {
      x: msgX + 14,
      y: msgY + 14,
      width: msgW - 28,
      fontSize: 13,
      color: JRPG.textMain,
    });
    this.typewriter.getObject().setDepth(131);

    this.messagePrompt = this.scene.add
      .text(msgX + msgW - 18, msgY + msgH - 16, '▼', {
        fontFamily: UI_FONT,
        fontSize: '14px',
        color: JRPG.cursor,
      })
      .setOrigin(0.5)
      .setDepth(131)
      .setVisible(false);

    this.root.add([this.typewriter.getObject(), this.messagePrompt]);
  }

  showMessage(text: string, onAck?: () => void) {
    this.commandContainer.setVisible(false);
    this.messageBox.setVisible(true);
    this.clearInput();
    this.onMessageAck = onAck;
    this.messagePrompt.setVisible(false);
    this.blinkTween?.stop();

    this.typewriter.start(text, () => {
      this.messagePrompt.setVisible(true);
      this.blinkTween = this.scene.tweens.add({
        targets: this.messagePrompt,
        alpha: 0.2,
        duration: 380,
        yoyo: true,
        repeat: -1,
      });
      this.bindAckInput();
    });
  }

  showCommandMenu(options: BattleCommandOption[], onSelect: (cmd: BattleCommand) => void) {
    this.clearInput();
    this.onCommandSelect = onSelect;
    this.commandOptions = options.filter(o => o.enabled);
    this.selectedCommand = 0;

    this.messageBox.setVisible(false);
    this.commandContainer.setVisible(true);

    this.commandTexts.forEach(t => t.destroy());
    this.commandTexts = [];

    const { height: h } = this.scene.scale;
    const cmdX = 10;
    const cmdY = h - 108 - 10;

    this.commandOptions.forEach((opt, i) => {
      const txt = this.scene.add
        .text(cmdX + 32, cmdY + 14 + i * 22, opt.label, {
          fontFamily: UI_FONT,
          fontSize: '13px',
          color: JRPG.textChoice,
        })
        .setDepth(121)
        .setInteractive({ useHandCursor: true });

      txt.on('pointerdown', () => {
        this.selectedCommand = i;
        this.updateCommandHighlight();
        this.confirmCommand();
      });
      txt.on('pointerover', () => {
        this.selectedCommand = i;
        this.updateCommandHighlight();
      });

      this.commandTexts.push(txt);
    });

    this.updateCommandHighlight();
    this.setupCommandInput();
  }

  private updateCommandHighlight() {
    const opt = this.commandOptions[this.selectedCommand];
    if (!opt) return;
    const idx = this.commandOptions.indexOf(opt);
    this.commandCursor.setY(this.commandTexts[idx]?.y ?? this.commandCursor.y);
    this.commandTexts.forEach((t, i) => {
      t.setColor(i === idx ? JRPG.textChoiceActive : JRPG.textChoice);
    });
  }

  private confirmCommand() {
    const opt = this.commandOptions[this.selectedCommand];
    if (opt) this.onCommandSelect?.(opt.id);
  }

  private setupCommandInput() {
    this.bindKey('keydown-UP', () => {
      this.selectedCommand = (this.selectedCommand - 1 + this.commandOptions.length) % this.commandOptions.length;
      this.updateCommandHighlight();
    });
    this.bindKey('keydown-DOWN', () => {
      this.selectedCommand = (this.selectedCommand + 1) % this.commandOptions.length;
      this.updateCommandHighlight();
    });
    this.bindKey('keydown-SPACE', () => this.confirmCommand());
    this.bindKey('keydown-ENTER', () => this.confirmCommand());
    this.bindKey('keydown-ONE', () => this.pickCommandByIndex(0));
    this.bindKey('keydown-TWO', () => this.pickCommandByIndex(1));
    this.bindKey('keydown-THREE', () => this.pickCommandByIndex(2));
    this.bindKey('keydown-FOUR', () => this.pickCommandByIndex(3));
  }

  private pickCommandByIndex(i: number) {
    if (i < this.commandOptions.length) {
      this.onCommandSelect?.(this.commandOptions[i].id);
    }
  }

  private bindAckInput() {
    const handler = () => {
      if (!this.typewriter.isComplete()) {
        this.typewriter.skip();
        return;
      }
      this.clearInput();
      this.blinkTween?.stop();
      this.onMessageAck?.();
    };
    this.bindKey('keydown-SPACE', handler);
    this.bindKey('keydown-ENTER', handler);
    this.scene.input.once('pointerdown', handler);
  }

  updateEnemyHp(hp: number, maxHp: number) {
    const barW = 80;
    this.enemyHpGfx.clear();
    this.drawHpBar(this.enemyHpGfx, -barW / 2, 32, barW, 6, hp, maxHp);
  }

  updatePartyHp(hp: number, maxHp: number) {
    const { width: w, height: h } = this.scene.scale;
    const panelW = 168;
    const panelX = w - panelW - 10;
    const panelY = Math.floor(h * 0.58) - 56 - 6;

    this.playerHpText.setText(`HP ${hp}/${maxHp}`);
    this.playerHpGfx.clear();
    this.drawHpBar(this.playerHpGfx, panelX + 10, panelY + 40, panelW - 20, 8, hp, maxHp);
  }

  private drawHpBar(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    hp: number,
    maxHp: number,
  ) {
    const ratio = Math.max(0, Math.min(1, hp / maxHp));
    g.fillStyle(JRPG.hpBg, 1);
    g.fillRect(x, y, w, h);
    const color = ratio > 0.5 ? JRPG.hpHigh : ratio > 0.25 ? JRPG.hpMid : JRPG.hpLow;
    g.fillStyle(color, 1);
    g.fillRect(x, y, Math.floor(w * ratio), h);
    g.lineStyle(1, JRPG.windowBorderInner, 0.8);
    g.strokeRect(x, y, w, h);
  }

  playAttackOnEnemy(onComplete?: () => void) {
    this.scene.tweens.add({
      targets: this.enemyContainer,
      x: this.enemyContainer.x - 10,
      duration: 60,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        this.flashSprite(this.enemyContainer, 0xffffff);
        onComplete?.();
      },
    });
  }

  playAttackOnPlayer(onComplete?: () => void) {
    this.scene.cameras.main.shake(180, 0.004);
    this.flashScreen(0xff4444, onComplete);
  }

  playEnemyDefeat(onComplete?: () => void) {
    this.scene.tweens.add({
      targets: this.enemyContainer,
      alpha: 0,
      scaleX: 1.4,
      scaleY: 0.2,
      duration: 700,
      ease: 'Quad.easeIn',
      onComplete,
    });
  }

  private flashSprite(target: Phaser.GameObjects.Container, color: number) {
    const flash = this.scene.add.graphics();
    flash.fillStyle(color, 0.7);
    flash.fillCircle(target.x, target.y - 8, 30);
    flash.setDepth(200);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 200,
      onComplete: () => flash.destroy(),
    });
  }

  private flashScreen(color: number, onComplete?: () => void) {
    const { width: w, height: h } = this.scene.scale;
    const flash = this.scene.add.rectangle(w / 2, h / 2, w, h, color, 0.25).setDepth(300);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 220,
      onComplete: () => {
        flash.destroy();
        onComplete?.();
      },
    });
  }

  private bindKey(event: string, fn: () => void) {
    this.scene.input.keyboard?.on(event, fn);
    this.inputHandlers.push({ event, fn });
  }

  private clearInput() {
    for (const h of this.inputHandlers) {
      this.scene.input.keyboard?.off(h.event, h.fn);
    }
    this.inputHandlers = [];
  }

  destroy() {
    this.clearInput();
    this.blinkTween?.stop();
    this.commandTexts.forEach(t => t.destroy());
    this.commandTexts = [];
    this.typewriter?.destroy();
    this.root?.destroy(true);
  }
}