# Capture une fenetre Windows par son titre (et/ou process) en PNG.
# Capture l'ecran virtuel entier puis crop -- evite tout decalage entre
# GetWindowRect et un CopyFromScreen partiel separe.
# Usage: .\capture-window.ps1 -Title "Hooky" -Out "pet.png" [-Trim 8] [-Process msedge]
param(
    [string]$Title = "",
    [switch]$TitleContains,
    [string]$Process = "",
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Trim = 0
)

Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
public class Win32Cap {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
    [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
    [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")] public static extern int GetSystemMetrics(int nIndex);
    [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);
    [DllImport("user32.dll")] public static extern int GetWindowThreadProcessId(IntPtr hWnd, out int lpdwProcessId);
    public struct RECT { public int Left, Top, Right, Bottom; }
}
"@

[Win32Cap]::SetProcessDPIAware() | Out-Null

$script:found = [IntPtr]::Zero
$callback = {
    param($hWnd, $lParam)
    if ([Win32Cap]::IsWindowVisible($hWnd)) {
        $sb = New-Object System.Text.StringBuilder 256
        [Win32Cap]::GetWindowText($hWnd, $sb, 256) | Out-Null
        if ($TitleContains) {
            $titleOk = (-not $Title) -or $sb.ToString().Contains($Title)
        } else {
            $titleOk = (-not $Title) -or ($sb.ToString() -eq $Title)
        }
        $processOk = $true
        if ($Process) {
            $procId = 0
            [Win32Cap]::GetWindowThreadProcessId($hWnd, [ref]$procId) | Out-Null
            $procName = try { (Get-Process -Id $procId).ProcessName } catch { "" }
            $processOk = $procName -eq $Process
        }
        if ($titleOk -and $processOk -and $sb.ToString().Length -gt 0) {
            $script:found = $hWnd
            return $false
        }
    }
    return $true
}
[Win32Cap]::EnumWindows($callback, [IntPtr]::Zero) | Out-Null

if ($script:found -eq [IntPtr]::Zero) {
    Write-Error "Fenetre introuvable pour Title='$Title' Process='$Process' (verifie qu'elle est ouverte et visible)"
    exit 1
}

if ([Win32Cap]::IsIconic($script:found)) {
    [Win32Cap]::ShowWindow($script:found, 9) | Out-Null # SW_RESTORE
    Start-Sleep -Milliseconds 300
}

# SetForegroundWindow depuis un process en arriere-plan est bloque par Windows
# (anti focus-stealing) -- SetWindowPos HWND_TOPMOST, lui, n'a pas cette
# restriction : remonte la fenetre au sommet du Z-order sans lui donner le focus.
$HWND_TOPMOST = [IntPtr]-1
$HWND_NOTOPMOST = [IntPtr]-2
$SWP_NOMOVE = 0x2; $SWP_NOSIZE = 0x1; $SWP_NOACTIVATE = 0x10
$flags = $SWP_NOMOVE -bor $SWP_NOSIZE -bor $SWP_NOACTIVATE
[Win32Cap]::SetWindowPos($script:found, $HWND_TOPMOST, 0, 0, 0, 0, $flags) | Out-Null
Start-Sleep -Milliseconds 200

$winRect = New-Object Win32Cap+RECT
[Win32Cap]::GetWindowRect($script:found, [ref]$winRect) | Out-Null

# Ecran virtuel entier (tous moniteurs), memes coordonnees physiques que GetWindowRect
$vLeft = [Win32Cap]::GetSystemMetrics(76)   # SM_XVIRTUALSCREEN
$vTop = [Win32Cap]::GetSystemMetrics(77)    # SM_YVIRTUALSCREEN
$vWidth = [Win32Cap]::GetSystemMetrics(78)  # SM_CXVIRTUALSCREEN
$vHeight = [Win32Cap]::GetSystemMetrics(79) # SM_CYVIRTUALSCREEN

Add-Type -AssemblyName System.Drawing
$full = New-Object System.Drawing.Bitmap $vWidth, $vHeight
$graphics = [System.Drawing.Graphics]::FromImage($full)
$graphics.CopyFromScreen($vLeft, $vTop, 0, 0, (New-Object System.Drawing.Size $vWidth, $vHeight))
$graphics.Dispose()

$cropLeft = $winRect.Left - $vLeft
$cropTop = $winRect.Top - $vTop
$cropWidth = $winRect.Right - $winRect.Left
$cropHeight = $winRect.Bottom - $winRect.Top

if ($Trim -gt 0) {
    $cropLeft += $Trim
    $cropTop += $Trim
    $cropWidth -= 2 * $Trim
    $cropHeight -= 2 * $Trim
}

$cropRect = New-Object System.Drawing.Rectangle $cropLeft, $cropTop, $cropWidth, $cropHeight
$bitmap = $full.Clone($cropRect, $full.PixelFormat)
$full.Dispose()

[Win32Cap]::SetWindowPos($script:found, $HWND_NOTOPMOST, 0, 0, 0, 0, $flags) | Out-Null

$bitmap.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png)
$msg = "Captured: $Out ($($bitmap.Width) x $($bitmap.Height))"
$bitmap.Dispose()
Write-Output $msg
