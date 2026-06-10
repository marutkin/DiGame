# DiGame Project Rules

See [SKILLS.md](./SKILLS.md) for the full architecture, content creation pipelines, coding conventions, and step-by-step recipes for extending the game.

Key invariants:
- All story and map content must be data-driven (Tiled + JSON under assets/data).
- Touch + keyboard must both work at all times.
- Russian for player-facing text; English for code and technical docs.
- Update SKILLS.md whenever core systems or authoring workflows change.
- Prefer editing JSON / Tiled maps over hardcoding story logic in scenes.
- Always test grid movement and interactions after changes to OverworldScene.
