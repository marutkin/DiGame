# Builds small composite tilesets with known 1-based indices for map generator.
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$srcTown = Join-Path $root "assets/images/_src/tiny-town/Tiles"
$srcDungeon = Join-Path $root "assets/images/_src/tiny-dungeon/Tiles"
$srcForest = Join-Path $root "assets/images/_src/rpg-pack/Spritesheet/roguelikeSheet_transparent.png"
$out = Join-Path $root "assets/images/tilesets"

function Build-Strip($tiles, $outPath) {
    $count = $tiles.Count
    $bmp = New-Object System.Drawing.Bitmap ($count * 16), 16
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear([System.Drawing.Color]::FromArgb(0,0,0,0))
    for ($i = 0; $i -lt $count; $i++) {
        $tilePath = $tiles[$i]
        if (Test-Path $tilePath) {
            $img = [System.Drawing.Image]::FromFile($tilePath)
            $g.DrawImage($img, $i * 16, 0, 16, 16)
            $img.Dispose()
        }
    }
    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Town: grass, grass2, path, water, tree, wall, roof, flowers
$townTiles = @(
    (Join-Path $srcTown "tile_0001.png"),
    (Join-Path $srcTown "tile_0002.png"),
    (Join-Path $srcTown "tile_0048.png"),
    (Join-Path $srcTown "tile_0021.png"),
    (Join-Path $srcTown "tile_0065.png"),
    (Join-Path $srcTown "tile_0066.png"),
    (Join-Path $srcTown "tile_0081.png"),
    (Join-Path $srcTown "tile_0036.png")
)
Build-Strip $townTiles (Join-Path $out "town_game.png")

# Dungeon: stone floor, floor2, carpet, wall
$dungeonTiles = @(
    (Join-Path $srcDungeon "tile_0000.png"),
    (Join-Path $srcDungeon "tile_0001.png"),
    (Join-Path $srcDungeon "tile_0008.png"),
    (Join-Path $srcDungeon "tile_0013.png")
)
Build-Strip $dungeonTiles (Join-Path $out "dungeon_game.png")

# Forest from RPG sheet — extract tiles at known positions (spacing 1)
function Extract-RpgTile($sheetPath, $col, $row, $outPath) {
    if (-not (Test-Path $sheetPath)) { return }
    $sheet = [System.Drawing.Image]::FromFile($sheetPath)
    $bmp = New-Object System.Drawing.Bitmap 16, 16
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $x = $col * 17
    $y = $row * 17
    $g.DrawImage($sheet, 0, 0, (New-Object System.Drawing.Rectangle $x, $y, 16, 16), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $sheet.Dispose()
}

$tmp = Join-Path $out "_forest_tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
# RPG pack sample_map uses grass ~ col 1 row 1 area — tuned visually from Kenney sample
Extract-RpgTile $srcForest 1 4 (Join-Path $tmp "grass.png")
Extract-RpgTile $srcForest 2 4 (Join-Path $tmp "grass2.png")
Extract-RpgTile $srcForest 3 4 (Join-Path $tmp "path.png")
Extract-RpgTile $srcForest 4 1 (Join-Path $tmp "water.png")
Extract-RpgTile $srcForest 8 2 (Join-Path $tmp "tree.png")
Extract-RpgTile $srcForest 9 2 (Join-Path $tmp "wall.png")
Extract-RpgTile $srcForest 0 0 (Join-Path $tmp "flower.png")

$forestTiles = @(
    (Join-Path $tmp "grass.png"),
    (Join-Path $tmp "grass2.png"),
    (Join-Path $tmp "path.png"),
    (Join-Path $tmp "water.png"),
    (Join-Path $tmp "tree.png"),
    (Join-Path $tmp "wall.png"),
    (Join-Path $tmp "flower.png")
)
Build-Strip $forestTiles (Join-Path $out "forest_game.png")
Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue

Write-Host "Composite tilesets built."