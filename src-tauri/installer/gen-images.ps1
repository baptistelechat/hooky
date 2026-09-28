# Régénère les bitmaps de l'installateur NSIS depuis icons/icon.png.
# NSIS exige du BMP 24 bits sans alpha : 164x314 (sidebar) et 150x57 (header).
# Outil manuel : les .bmp sont commités, la CI ne lance PAS ce script.
# À relancer uniquement si le logo ou le texte change.
# Usage : powershell -File src-tauri/installer/gen-images.ps1
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$logo = [System.Drawing.Image]::FromFile((Join-Path $root 'icons/icon.png'))
$dark = [System.Drawing.ColorTranslator]::FromHtml('#12151a')

function New-Canvas($w, $h, $bg) {
  $bmp = New-Object System.Drawing.Bitmap $w, $h, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear($bg)
  return @($bmp, $g)
}

# Sidebar (pages Bienvenue / Fin)
$bmp, $g = New-Canvas 164 314 $dark
$g.DrawImage($logo, 22, 70, 120, 120)
$fmt = New-Object System.Drawing.StringFormat; $fmt.Alignment = 'Center'
$g.DrawString('Hooky', (New-Object System.Drawing.Font 'Segoe UI Semibold', 20), [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF 0, 200, 164, 36), $fmt)
$grey = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#9aa0a6'))
$g.DrawString('for Claude Code', (New-Object System.Drawing.Font 'Segoe UI', 9), $grey, (New-Object System.Drawing.RectangleF 0, 238, 164, 20), $fmt)
$bmp.Save((Join-Path $PSScriptRoot 'sidebar.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)

# Header (pages internes, fond blanc du bandeau)
$bmp, $g = New-Canvas 150 57 ([System.Drawing.Color]::White)
$g.DrawImage($logo, 96, 6, 45, 45)
$bmp.Save((Join-Path $PSScriptRoot 'header.bmp'), [System.Drawing.Imaging.ImageFormat]::Bmp)
