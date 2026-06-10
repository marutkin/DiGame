/**
 * VirtualJoystick.ts
 * Простой, но надёжный виртуальный джойстик специально для мобильного Safari.
 * Не зависит от внешних плагинов (rex-virtual-joystick и т.п.).
 * 
 * Использование:
 *   const joystick = new VirtualJoystick(this, 80, height - 90);
 *   const force = joystick.getForce(); // {x: -1..1, y: -1..1}
 */

import Phaser from 'phaser';

export interface JoystickForce {
  x: number; // -1 ... 1
  y: number; // -1 ... 1
  angle: number; // радианы
  distance: number; // 0 ... 1 (нормализовано)
}

export class VirtualJoystick {
  private scene: Phaser.Scene;
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private baseRadius: number = 52;   // крупнее для пальца
  private knobRadius: number = 26;

  private pointer: Phaser.Input.Pointer | null = null;
  private active: boolean = false;

  private force: JoystickForce = { x: 0, y: 0, angle: 0, distance: 0 };

  // Дополнительная графика для лучшей видимости (внешнее кольцо + линия направления)
  private outer: Phaser.GameObjects.Arc;
  private stick: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Внешнее кольцо (для лучшей видимости на любом фоне)
    this.outer = scene.add.arc(x, y, this.baseRadius + 6, 0, 360, false, 0x000000, 0);
    this.outer.setStrokeStyle(4, 0x5a4a7a, 0.65);
    this.outer.setDepth(999);
    this.outer.setScrollFactor(0);

    // Полупрозрачная база (классический джойстик)
    this.base = scene.add.arc(x, y, this.baseRadius, 0, 360, false, 0x162033, 0.65);
    this.base.setStrokeStyle(4, 0xa8a0c0, 0.95);
    this.base.setDepth(1000);
    this.base.setScrollFactor(0);

    // Ручка (knob) — ярче
    this.knob = scene.add.arc(x, y, this.knobRadius, 0, 360, false, 0xf0e0c8, 0.95);
    this.knob.setStrokeStyle(3, 0x2f2638, 1);
    this.knob.setDepth(1001);
    this.knob.setScrollFactor(0);

    // Графика для линии "палки" джойстика (показывает направление когда тянем)
    this.stick = scene.add.graphics();
    this.stick.setDepth(1000);
    this.stick.setScrollFactor(0);

    this.setupInput(x, y);
  }

  private setupInput(centerX: number, centerY: number): void {
    const input = this.scene.input;

    // Начинаем drag по тапу в зоне джойстика
    input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const dist = Phaser.Math.Distance.Between(pointer.x, pointer.y, centerX, centerY);
      if (dist < this.baseRadius * 1.6) {
        this.active = true;
        this.pointer = pointer;
        this.moveKnob(pointer.x, pointer.y, centerX, centerY);
      }
    });

    input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.active && this.pointer && pointer.id === this.pointer.id) {
        this.moveKnob(pointer.x, pointer.y, centerX, centerY);
      }
    });

    const endDrag = (pointer: Phaser.Input.Pointer) => {
      if (this.pointer && pointer.id === this.pointer.id) {
        this.active = false;
        this.pointer = null;

        // Очищаем линию направления
        this.stick.clear();

        // Возвращаем knob в центр с плавной анимацией
        this.scene.tweens.add({
          targets: this.knob,
          x: centerX,
          y: centerY,
          duration: 110,
          ease: 'Sine.easeOut'
        });

        this.force = { x: 0, y: 0, angle: 0, distance: 0 };
      }
    };

    input.on('pointerup', endDrag);
    input.on('pointerupoutside', endDrag);
  }

  private moveKnob(px: number, py: number, cx: number, cy: number): void {
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.baseRadius - this.knobRadius * 0.55;

    let nx = dx;
    let ny = dy;

    if (dist > maxDist) {
      const scale = maxDist / dist;
      nx *= scale;
      ny *= scale;
    }

    this.knob.x = cx + nx;
    this.knob.y = cy + ny;

    // Рисуем линию от центра базы к ручке (отличный визуальный фидбек)
    this.stick.clear();
    this.stick.lineStyle(3, 0xc8b090, 0.75);
    this.stick.beginPath();
    this.stick.moveTo(cx, cy);
    this.stick.lineTo(this.knob.x, this.knob.y);
    this.stick.strokePath();

    // Нормализованная сила
    const normDist = Math.min(dist / maxDist, 1);
    const angle = Math.atan2(dy, dx);

    this.force = {
      x: Math.cos(angle) * normDist,
      y: Math.sin(angle) * normDist,
      angle,
      distance: normDist
    };
  }

  /** Возвращает текущую силу джойстика. Вызывать каждый кадр в update. */
  getForce(): JoystickForce {
    return this.force;
  }

  /** Показать / спрятать (полезно в бою) */
  setVisible(visible: boolean): void {
    this.outer.setVisible(visible);
    this.base.setVisible(visible);
    this.knob.setVisible(visible);
    this.stick.setVisible(visible);
  }

  destroy(): void {
    this.outer.destroy();
    this.base.destroy();
    this.knob.destroy();
    this.stick.destroy();
    // Слушатели Phaser input удалятся автоматически при уничтожении сцены
  }
}
