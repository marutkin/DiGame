import Phaser from 'phaser';

interface AudioEntry {
  file: string;
  volume: number;
}

/**
 * Thin wrapper for one-shot SFX from assets/data/audio.json.
 */
export class AudioManager {
  private scene: Phaser.Scene;
  private config: Record<string, AudioEntry>;
  private muted = false;

  constructor(scene: Phaser.Scene, config: Record<string, AudioEntry>) {
    this.scene = scene;
    this.config = config;
  }

  play(key: string) {
    if (this.muted || !this.config[key]) return;
    if (!this.scene.cache.audio.exists(key)) return;
    this.scene.sound.play(key, { volume: this.config[key].volume });
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }
}