param(
    [string]$TaskName = "Instagram Like Checker",
    [string]$DailyTime = "09:15"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Node = (Get-Command node).Source
$EntryPoint = Join-Path $ProjectRoot "src\main.js"

$Action = New-ScheduledTaskAction `
    -Execute $Node `
    -Argument ('"{0}"' -f $EntryPoint) `
    -WorkingDirectory $ProjectRoot
$Trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime
$Settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 45)
$Principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType InteractiveToken `
    -RunLevel Limited

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $Action `
    -Trigger $Trigger `
    -Settings $Settings `
    -Principal $Principal `
    -Description "Read-only check for unliked posts from one Instagram profile" `
    -Force | Out-Null

Write-Host "Installed '$TaskName' to run daily at $DailyTime."
