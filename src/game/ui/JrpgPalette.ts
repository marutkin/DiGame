/** Shared JRPG UI colors — inspired by SNES Final Fantasy windows. */
export const JRPG = {
  windowFill: 0x101848,
  windowFillLight: 0x182060,
  windowBorderOuter: 0xf8f8f8,
  windowBorderInner: 0x6888cc,
  windowBorderShadow: 0x080818,
  textMain: '#f0f0f8',
  textSpeaker: '#ffe878',
  textDim: '#a0a8c8',
  textChoice: '#e8f0ff',
  textChoiceActive: '#ffffff',
  cursor: '#ff8844',
  hpHigh: 0x44cc66,
  hpMid: 0xcccc44,
  hpLow: 0xcc4444,
  hpBg: 0x1a1a2a,
  overlay: 0x000010,
  battleSkyTop: 0x283868,
  battleSkyBottom: 0x4868a8,
  battleGround: 0x284828,
  enemyGlow: 0x66ffaa,
  playerGlow: 0x88bbff,
} as const;

export const UI_FONT = '"Courier New", Courier, monospace';