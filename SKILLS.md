---
name: digame-project
description: >
  Core instructions for working on DiGame — a small RPG Maker-like smartphone game
  using Phaser 3, TypeScript, Vite and Tiled. Use when developing features, adding
  content, or maintaining the project. Also loaded via AGENTS.md for automatic context.
---

# DiGame — Project Skills & Guidelines

This is the single source of truth for how to build and extend DiGame.

## 1. Project Vision & MVP Definition

A charming, small, completely client-side top-down RPG that feels like classic RPG Maker games (exploration, talking, choices, light progression) but runs great on modern smartphones in a browser and is hosted for free on GitHub Pages.

**Current state (after initial implementation):**
- One Tiled map (village) with grid movement + wall collision
- One interactable NPC with multi-page Russian dialogue + branching choice
- Effects from choices (setFlag / giveItem) are logged (real FlagStore & Inventory coming)
- Works with keyboard on desktop and touch on phones
- Build outputs to `docs/` for trivial GitHub Pages hosting

**MVP "done" criteria (playable short experience):**
- 2–3 connected small maps
- 5–8 meaningful interactions / NPCs
- At least one short branching quest with 2–3 choices that matter
- One very simple battle or dramatic event
- Save/load via localStorage
- Solid touch controls (virtual pad + action)
- Clear ending

## 2. Tech Stack & Why

- **Phaser 3** — best balance of power vs simplicity for tile-based RPGs (excellent Tiled support, scenes, input, camera, Arcade physics).
- **TypeScript + Vite** — fast iteration, type safety on game state and data, easy static build.
- **Tiled** (free) — the practical equivalent of RPG Maker's map editor. All maps live as `.json` in `assets/maps/`.
- **GitHub Pages** — zero-cost static hosting. We build to `docs/` and serve from there on the `main` branch.

**Hard rules:**
- No heavy backend.
- Keep total size small (< ~8 MB for the whole game).
- Pixel art aesthetic (16×16 or 32×32 tiles preferred).
- Russian for all player-facing text and UI. English for code, comments, and this SKILLS.md.

## 3. Directory Structure & Responsibilities

See the tree in README.md.

Particularly important:
- `assets/maps/*.json` — only edit these with Tiled. Never hand-edit the exported data unless you know exactly what you're doing.
- `assets/data/dialogues.json` — all story text and choice effects live here.
- `src/game/scenes/OverworldScene.ts` — heart of gameplay (movement, collision, interaction, dialogue triggering).
- `src/game/systems/` — extract pure logic here (DialogueManager, FlagStore, EventSystem, SaveManager, etc.) as the game grows.
- `src/game/types.ts` — shared interfaces (`SaveState`, `Effect`, `Dialogue`, etc.).

## 4. Development Workflow

```bash
npm install
npm run dev          # dev server with LAN URL for phone testing
npm run build        # produces docs/ (ready for Pages)
```

**Mobile testing during development:**
1. Run `npm run dev`
2. Note the "Network" address in the terminal
3. Open it on your phone (same Wi-Fi)
4. Use Chrome DevTools → Device toolbar for quick checks

**Map editing:**
1. Open the `.json` in Tiled (or create new map with same tileset settings).
2. Required layers (names matter):
   - `Ground` (tile layer)
   - `Walls` (tile layer — used for collision, non-zero tiles block)
   - `Events` (object layer) — place rectangles/objects here for NPCs, warps, chests, etc.
3. On objects in Events layer add custom properties (string):
   - `type`: "npc" | "warp" | "chest" | "sign"
   - `dialogueId`: id from dialogues.json (for npc/sign)
   - `targetMap`, `targetX`, `targetY` (for warp)
   - `item`, `requiresFlag`, etc. as needed
4. Export as JSON (overwrite the file in `assets/maps/`).
5. Reload the game — changes are live.

## 5. Dialogue & Event Data Format

See the current `assets/data/dialogues.json` for the exact shape.

Core idea:
```json
"some_id": {
  "pages": [ { "speaker": "Имя", "text": "..." }, ... ],
  "choices": [
    {
      "text": "Вариант ответа",
      "effects": [ { "type": "setFlag", "key": "quest_started", "value": true }, ... ],
      "next": "next_dialogue_id_or_null"
    }
  ]
}
```

Supported effect types (see `src/game/types.ts`):
- `setFlag`, `setVar`
- `giveItem`, `removeItem`
- `warp`
- `startBattle`
- `endGame`

When adding new effect kinds, update the type + the place that applies effects (currently inline in OverworldScene, later in EventSystem).

## 6. Coding Conventions

- Strict TypeScript everywhere (`noImplicitAny`, etc. — tsconfig enforces).
- Scene names end with `Scene` (`TitleScene`, `OverworldScene`).
- Systems / managers live in `systems/`.
- Prefer data-driven content. Hard-coded story text or event logic in scenes is a smell.
- Keep the player movement feeling "classic RPG Maker": one tile at a time, facing direction, action only when facing or very close to target.
- Camera follows player. Bounds are set to current map size.
- All player-facing strings in Russian.

## 7. Mobile & Touch Guidelines

- `index.html` already has proper viewport + `touch-action: none`.
- Game uses `Phaser.Scale.RESIZE` + `pixelArt: true`.
- Virtual controls (directional pad + big action button) will live in `MobileControls.ts` and only appear on touch devices.
- Minimum comfortable tap targets: 44–48 px.
- Test on real phones in both portrait and landscape after any input or UI change.
- Never rely only on long-press or multi-finger gestures.

## 8. Common Tasks (Recipes)

### Add a new NPC with dialogue + a choice that gives an item

1. In Tiled place a small rectangle on the `Events` layer.
2. Add custom properties:
   - `type` = `npc`
   - `dialogueId` = `new_npc_intro`
3. Add the dialogue entry in `assets/data/dialogues.json` (use the existing elder as template).
4. In the choice that should give an item, add an effect:
   ```json
   { "type": "giveItem", "itemId": "rusty_key" }
   ```
5. (Later) register the item in items.json and handle `giveItem` in Inventory system.
6. Reload and test interaction + choice.

### Create a new map area and connect it

1. Create new map in Tiled (same tile size, same placeholder tileset for now).
2. Add at least Ground + Walls + Events layers.
3. Export as `assets/maps/forest.json`.
4. Place a warp object on current map (e.g. village) with properties:
   - `type`: `warp`
   - `targetMap`: `forest`
   - `targetX`, `targetY`: tile coordinates in the new map
5. In OverworldScene (or EventSystem) handle warp by stopping current scene and starting `OverworldScene` again with the new map key (or a dedicated map loader).
6. Add a return warp on the new map.

### Add background music or sound

1. Put small .ogg / .mp3 in `assets/audio/`.
2. In PreloadScene (or Overworld) do `this.load.audio('bgm_village', 'assets/audio/village.ogg')`.
3. Play with `this.sound.play('bgm_village', { loop: true, volume: 0.6 })`.
4. Respect user mute (add a simple settings flag later).

## 9. State, Saving & Flags

Current save shape is defined in `src/game/types.ts` (`SaveState`).

When you add a new persisted value:
- Add it to the interface
- Make sure SaveManager (when implemented) serializes/deserializes it
- Update any migration code if the version changes

Never store functions or DOM nodes in save state.

## 10. Testing & Verification Checklist (before "done")

- [ ] Full playthrough on desktop keyboard (all maps, all dialogues, all choices, save/load)
- [ ] Same playthrough on real phone (or at least Chrome DevTools + touch + different sizes)
- [ ] `npm run build` succeeds with no errors
- [ ] After build, `docs/index.html` + assets work when served locally (`npx serve docs`)
- [ ] Grid movement feels good and you cannot walk through walls
- [ ] Interaction only triggers when reasonably close / facing the target
- [ ] Russian text is readable and doesn't overflow on narrow screens
- [ ] No console errors or warnings during normal play
- [ ] `grok inspect` (or VS Code extension) shows AGENTS.md / SKILLS.md loaded

## 11. Deployment

See README.md section "Сборка и публикация".

The critical Vite setting is in `vite.config.ts`:
```ts
build: { outDir: 'docs' },
base: './',
```

Commit the contents of `docs/` for the simplest Pages setup.

## 12. Asset Policy

- Start with runtime generated placeholder tiles (as we do now) or tiny public-domain sprites.
- When adding real art, prefer CC0 / public domain from:
  - OpenGameArt.org
  - Kenney.nl (UI + some tiles)
  - Itch.io "free for commercial use with attribution" packs
- Always credit sources in a `CREDITS.txt` or at the bottom of README.
- Keep individual spritesheets small. Prefer one combined atlas later if size becomes an issue.

## 13. Grok Build / AI Session Notes (very important)

- At the start of any session on this project, read `SKILLS.md` and `AGENTS.md`.
- Prefer editing `assets/data/*.json` and Tiled maps over scattering logic in TypeScript scenes.
- When you change core systems (movement, dialogue, events, save), update this SKILLS.md and the relevant recipes.
- Use `todo_write` for any feature that touches more than one scene or system.
- After big changes, run the verification checklist above (at least the desktop + one phone simulation pass).
- The inline dialogue code in OverworldScene is temporary. When a proper `DialogueManager` + `DialogueScene` exist, move the logic there and keep OverworldScene focused on world + input.
- Always keep keyboard and touch parity.

## 14. External References

- Phaser 3 examples (especially "tilemap" and "input" sections)
- Tiled documentation (custom properties on objects are your best friend)
- "Making your first Phaser 3 RPG" style tutorials (many exist — adapt the good parts)
- GitHub Pages + Vite docs for the `docs/` deploy trick

---

Keep this file up to date. It is the contract between you (human or AI) and the future maintainers of DiGame.

Happy world-building!
