Add-Type -AssemblyName System.Drawing

function New-GymIcon {
  param([int]$Size, [string]$Path)
  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#4f8cff'))
  $white = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::White)
  $scale = $Size / 512
  $graphics.FillRectangle($white, [int](116 * $scale), [int](226 * $scale), [int](280 * $scale), [int](60 * $scale))
  $graphics.FillRectangle($white, [int](76 * $scale), [int](166 * $scale), [int](68 * $scale), [int](180 * $scale))
  $graphics.FillRectangle($white, [int](368 * $scale), [int](166 * $scale), [int](68 * $scale), [int](180 * $scale))
  $graphics.FillRectangle($white, [int](48 * $scale), [int](202 * $scale), [int](48 * $scale), [int](108 * $scale))
  $graphics.FillRectangle($white, [int](416 * $scale), [int](202 * $scale), [int](48 * $scale), [int](108 * $scale))
  $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
  $white.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}

$public = Join-Path $PSScriptRoot '..\public'
New-GymIcon -Size 192 -Path (Join-Path $public 'icon-192.png')
New-GymIcon -Size 512 -Path (Join-Path $public 'icon-512.png')
New-GymIcon -Size 180 -Path (Join-Path $public 'apple-touch-icon.png')
