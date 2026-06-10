/**
 * main.ts — точка входа в игру.
 * Настроена специально под iPhone 16 Pro / iOS 18+ Safari.
 * 
 * Ключевые моменты:
 * - Phaser.Scale.FIT + CENTER_BOTH для корректного масштабирования
 * - pixelArt: true (классический JRPG стиль)
 * - physics: arcade (достаточно для тайлового мира и простых коллизий)
 * - Автоматическая разблокировка аудио на iOS (требуется для любых звуков)
 * - Скрытие загрузочного экрана после инициализации
 */

import Phaser from 'phaser';
import './style.css';
import { BootScene } from './scenes/BootScene';
import { WorldScene } from './scenes/WorldScene';
import { DialogueScene } from './scenes/DialogueScene';
import { CombatScene } from './scenes/CombatScene';
import { EndScene } from './scenes/EndScene';

// Разрешение "дизайна" — целевой размер для iPhone 16 Pro в портрете.
// Игра будет масштабироваться под любой экран с сохранением пропорций.
const GAME_WIDTH = 390;
const GAME_HEIGHT = 844;

// Основная конфигурация Phaser
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'game-container',
  
  // КРИТИЧНО ДЛЯ МОБИЛЬНЫХ:
  // FIT — сохраняет соотношение сторон и вписывает игру в экран
  // CENTER_BOTH — центрирует canvas
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    // Минимальные/максимальные размеры (защита от слишком мелкого/крупного)
    min: { width: 320, height: 568 },
    max: { width: 1280, height: 1280 }
  },

  // Классический пиксель-арт стиль JRPG
  pixelArt: true,
  antialias: false,
  roundPixels: true,

  // Физика — Arcade вполне достаточно для такого типа игры
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,           // Поменяй на true при отладке коллизий
      gravity: { x: 0, y: 0 } // Топ-даун вид — гравитация не нужна
    }
  },

  // Сцены в порядке загрузки
  scene: [
    BootScene,
    WorldScene,
    DialogueScene,
    CombatScene,
    EndScene
  ],

  // Фоновый цвет (тёмно-фиолетовый, атмосфера старых JRPG)
  backgroundColor: '#0f0a14',

  // Отключаем контекстное меню на ПК (на мобилках и так не мешает)
  disableContextMenu: true
};

// Создаём игру
const game = new Phaser.Game(config);

// === iOS Safari аудио разблокировка ===
// На iOS звук можно воспроизводить только после реального пользовательского жеста.
// Phaser сам пытается, но мы добавляем надёжный хук.
function unlockAudioOnFirstTouch() {
  const unlock = () => {
    // Пытаемся разблокировать Web Audio
    const context = (game.sound as any).context;
    if (context && context.state === 'suspended') {
      context.resume().then(() => {
        console.log('[Audio] iOS audio context unlocked');
      });
    }
    
    // Удаляем слушателей после первого успеха
    document.body.removeEventListener('touchstart', unlock);
    document.body.removeEventListener('touchend', unlock);
    document.body.removeEventListener('click', unlock);
  };

  document.body.addEventListener('touchstart', unlock, { once: true, passive: true });
  document.body.addEventListener('touchend', unlock, { once: true, passive: true });
  document.body.addEventListener('click', unlock, { once: true });
}

// Запускаем разблокировку при первой возможности
window.addEventListener('load', () => {
  unlockAudioOnFirstTouch();
});

// Скрываем загрузочный экран, когда Phaser готов
// (BootScene вызовет это событие)
window.addEventListener('phaser-game-ready', () => {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.style.transition = 'opacity 0.3s ease';
    loading.style.opacity = '0';
    setTimeout(() => loading.remove(), 350);
  }
});

// Экспортируем для отладки в консоли браузера
(window as any).game = game;

console.log('%c[DiGame] Мини-JRPG "Даша" инициализирована. Цель: iPhone 16 Pro Safari.', 'color:#8b7aa3');
