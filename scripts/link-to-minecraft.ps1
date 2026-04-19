# Windows: Minecraft com.mojang にシンボリックリンクを張る
# 管理者権限の PowerShell で実行すること

$repoRoot = Split-Path -Parent $PSScriptRoot
$mcBase = "$env:LOCALAPPDATA\Packages\Microsoft.MinecraftUWP_8wekyb3d8bbwe\LocalState\games\com.mojang"

$bpLink = "$mcBase\development_behavior_packs\arlt_story_BP"
$rpLink = "$mcBase\development_resource_packs\arlt_story_RP"

if (Test-Path $bpLink) { Remove-Item $bpLink -Force }
if (Test-Path $rpLink) { Remove-Item $rpLink -Force }

New-Item -ItemType Junction -Path $bpLink -Target "$repoRoot\src\BP"
New-Item -ItemType Junction -Path $rpLink -Target "$repoRoot\src\RP"

Write-Host "✅ リンク作成完了"
Write-Host "  BP → $bpLink"
Write-Host "  RP → $rpLink"
Write-Host ""
Write-Host "Minecraft を起動してワールド設定から BP/RP を有効化してください"
