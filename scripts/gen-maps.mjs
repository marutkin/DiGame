import { writeFileSync, readFileSync } from 'fs';

const tilesets = JSON.parse(readFileSync('assets/data/tilesets.json', 'utf8'));

function makeMap(mapKey, width, height, ground, walls, events, nextId) {
  const cfg = tilesets[mapKey];
  return {
    compressionlevel: -1,
    height,
    infinite: false,
    layers: [
      { data: ground, height, id: 1, name: 'Ground', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
      { data: walls, height, id: 2, name: 'Walls', opacity: 1, type: 'tilelayer', visible: true, width, x: 0, y: 0 },
      { draworder: 'topdown', id: 3, name: 'Events', objects: events, opacity: 1, type: 'objectgroup', visible: true, x: 0, y: 0 },
    ],
    nextlayerid: 4,
    nextobjectid: nextId,
    orientation: 'orthogonal',
    renderorder: 'right-down',
    tiledversion: '1.11.0',
    tileheight: 16,
    tilesets: [{
      columns: cfg.columns,
      firstgid: 1,
      image: `../images/tilesets/${cfg.key === 'town' ? 'town_game' : cfg.key === 'dungeon' ? 'dungeon_game' : 'forest_game'}.png`,
      imageheight: 16,
      imagewidth: cfg.columns * 16,
      margin: 0,
      name: cfg.key,
      spacing: cfg.spacing ?? 0,
      tilecount: cfg.columns,
      tileheight: 16,
      tilewidth: 16,
    }],
    tilewidth: 16,
    type: 'map',
    version: '1.10',
    width,
  };
}

function fill(w, h, v) { return Array(w * h).fill(v); }
function rect(g, w, x0, y0, x1, y1, v) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * w + x] = v;
}
function border(w, arr, v) {
  const h = arr.length / w;
  for (let x = 0; x < w; x++) { arr[x] = v; arr[(h - 1) * w + x] = v; }
  for (let y = 0; y < h; y++) { arr[y * w] = v; arr[y * w + w - 1] = v; }
}

const T = {
  village: tilesets.village.tiles,
  forest: tilesets.forest.tiles,
  chapel: tilesets.chapel.tiles,
};
const C = {
  village: tilesets.village.collision,
  forest: tilesets.forest.collision,
  chapel: tilesets.chapel.collision,
};

// Village 22x16
{
  const W = 22, H = 16, key = 'village';
  const g = fill(W, H, T.village.grass);
  const w = fill(W, H, 0);
  border(W, w, C.village);
  rect(g, W, 2, 2, 6, 5, T.village.roof); rect(w, W, 2, 2, 6, 5, C.village);
  rect(g, W, 14, 2, 18, 4, T.village.roof); rect(w, W, 14, 2, 18, 4, C.village);
  rect(g, W, 3, 8, 17, 9, T.village.path);
  rect(g, W, 17, 8, 18, 12, T.village.path);
  rect(g, W, 10, 2, 11, 7, T.village.path);
  rect(g, W, 3, 11, 6, 13, T.village.water);
  rect(w, W, 3, 11, 6, 13, C.village);
  rect(g, W, 12, 5, 12, 5, T.village.flowers);
  rect(g, W, 1, 1, 20, 1, T.village.tree); rect(w, W, 1, 1, 20, 1, C.village);
  const events = [
    // Плюша присоединяется сразу у "выхода из дома"
    { height: 16, id: 1, name: 'plusha', properties: [
      { name: 'type', type: 'string', value: 'npc' },
      { name: 'dialogueId', type: 'string', value: 'plusha_joins' },
      { name: 'sprite', type: 'string', value: 'npc_villager' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 96, y: 112 },
    // Первый Венгр (диалог + выбор драться)
    { height: 16, id: 2, name: 'vengr1', properties: [
      { name: 'type', type: 'string', value: 'npc' },
      { name: 'dialogueId', type: 'string', value: 'vengr_talk' },
      { name: 'sprite', type: 'string', value: 'enemy_common' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 192, y: 80 },
    // Второй Венгр — прямой бой
    { height: 16, id: 3, name: 'vengr2', properties: [
      { name: 'type', type: 'string', value: 'battle' },
      { name: 'enemyId', type: 'string', value: 'vengr' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 240, y: 160 },
    // Дима: ждёт или дарит подарок (conditional в EventSystem)
    { height: 16, id: 4, name: 'dima', properties: [
      { name: 'type', type: 'string', value: 'npc' },
      { name: 'dialogueId', type: 'string', value: 'dima_waiting' },
      { name: 'dialogueIdGift', type: 'string', value: 'dima_gift' },
      { name: 'sprite', type: 'string', value: 'npc_dima' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 128, y: 48 },
    // Вывеска
    { height: 16, id: 5, name: 'yard_sign', properties: [
      { name: 'type', type: 'string', value: 'sign' },
      { name: 'dialogueId', type: 'string', value: 'yard_sign' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 48, y: 160 },
    // Переход в логово
    { height: 16, id: 6, name: 'to_lair', properties: [
      { name: 'type', type: 'string', value: 'warp' },
      { name: 'targetMap', type: 'string', value: 'forest' },
      { name: 'targetX', type: 'int', value: 5 },
      { name: 'targetY', type: 'int', value: 8 },
    ], rotation: 0, type: '', visible: true, width: 16, x: 288, y: 96 },
    // Обратный вход домой (возле того места, куда игрок выходит из дома)
    { height: 16, id: 7, name: 'to_home', properties: [
      { name: 'type', type: 'string', value: 'warp' },
      { name: 'targetMap', type: 'string', value: 'chapel' },
      { name: 'targetX', type: 'int', value: 7 },
      { name: 'targetY', type: 'int', value: 10 },
    ], rotation: 0, type: '', visible: true, width: 16, x: 104, y: 128 },
  ];
  writeFileSync('assets/maps/village.json', JSON.stringify(makeMap(key, W, H, g, w, events, 8), null, 2));
}

// Forest 20x14
{
  const W = 20, H = 14, key = 'forest';
  const g = fill(W, H, T.forest.grass);
  const w = fill(W, H, 0);
  border(W, w, C.forest);
  rect(g, W, 6, 4, 13, 9, T.forest.path);
  for (let x = 2; x < W - 2; x += 2) { w[2 * W + x] = C.forest; g[2 * W + x] = T.forest.tree; }
  for (let x = 1; x < W - 1; x += 3) { w[10 * W + x] = C.forest; g[10 * W + x] = T.forest.tree; }
  const events = [
    // Главный босс — Людмила Конюхова
    { height: 16, id: 1, name: 'lyudmila', properties: [
      { name: 'type', type: 'string', value: 'npc' },
      { name: 'dialogueId', type: 'string', value: 'lyudmila_intro' },
      { name: 'dialogueIdDefeated', type: 'string', value: 'lyudmila_defeated' },
      { name: 'sprite', type: 'string', value: 'enemy_ludmila' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 128, y: 112 },
    // Предупреждающая табличка
    { height: 16, id: 2, name: 'lair_sign', properties: [
      { name: 'type', type: 'string', value: 'sign' },
      { name: 'dialogueId', type: 'string', value: 'lair_sign' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 48, y: 64 },
    // Возврат во двор после победы
    { height: 16, id: 3, name: 'return_to_yard', properties: [
      { name: 'type', type: 'string', value: 'warp' },
      { name: 'targetMap', type: 'string', value: 'village' },
      { name: 'targetX', type: 'int', value: 10 },
      { name: 'targetY', type: 'int', value: 10 },
    ], rotation: 0, type: '', visible: true, width: 16, x: 80, y: 192 },
  ];
  writeFileSync('assets/maps/forest.json', JSON.stringify(makeMap(key, W, H, g, w, events, 4), null, 2));
}

// Chapel 16x12
{
  const W = 16, H = 12, key = 'chapel';
  const g = fill(W, H, T.chapel.floor);
  const w = fill(W, H, 0);
  border(W, w, C.chapel);
  rect(g, W, 2, 2, 13, 10, T.chapel.carpet);
  rect(g, W, 6, 1, 9, 3, T.chapel.floor2);
  // South exit doorway
  w[11 * W + 7] = 0;
  w[11 * W + 8] = 0;
  g[11 * W + 7] = T.chapel.carpet;
  g[11 * W + 8] = T.chapel.carpet;
  const events = [
    // Записка с квестом от Димы (начало игры)
    { height: 16, id: 1, name: 'home_note', properties: [
      { name: 'type', type: 'string', value: 'sign' },
      { name: 'dialogueId', type: 'string', value: 'home_note' },
    ], rotation: 0, type: '', visible: true, width: 16, x: 112, y: 96 },
    // Выход из дома во двор (без требования флага)
    { height: 16, id: 2, name: 'exit_door', properties: [
      { name: 'type', type: 'string', value: 'warp' },
      { name: 'targetMap', type: 'string', value: 'village' },
      { name: 'targetX', type: 'int', value: 6 },
      { name: 'targetY', type: 'int', value: 7 },
    ], rotation: 0, type: '', visible: true, width: 16, x: 112, y: 168 },
  ];
  writeFileSync('assets/maps/chapel.json', JSON.stringify(makeMap(key, W, H, g, w, events, 3), null, 2));
}

console.log('Maps generated with Kenney tile indices.');