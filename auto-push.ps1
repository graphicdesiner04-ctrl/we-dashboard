# ── WE Dashboard Auto-Push ────────────────────────────────────────────────
# شغّل هذا السكريبت مرة واحدة، وكل تغيير في الكود هيتنشر أوتوماتيك على GitHub
# Run: powershell -ExecutionPolicy Bypass -File auto-push.ps1

$projectPath = $PSScriptRoot
$debounceSeconds = 10   # ثواني انتظار بعد آخر تغيير قبل الـ push

Write-Host "🚀 WE Dashboard Auto-Push شغّال..." -ForegroundColor Cyan
Write-Host "📁 المجلد: $projectPath" -ForegroundColor Gray
Write-Host "⏱  سيُرسل التعديل بعد $debounceSeconds ثانية من آخر حفظ" -ForegroundColor Gray
Write-Host "──────────────────────────────────────────" -ForegroundColor DarkGray

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = $projectPath
$watcher.Filter = "*.*"
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [System.IO.NotifyFilters]'LastWrite,FileName,DirectoryName'

$timer = $null
$lastEvent = $null

$action = {
    $path = $Event.SourceEventArgs.FullPath
    # تجاهل ملفات git وnode_modules والـ dist
    if ($path -match '\\\.git\\' -or $path -match '\\node_modules\\' -or $path -match '\\dist\\') { return }

    $script:lastEvent = $path
    if ($script:timer) { $script:timer.Stop(); $script:timer.Dispose() }

    $script:timer = New-Object System.Timers.Timer
    $script:timer.Interval = $debounceSeconds * 1000
    $script:timer.AutoReset = $false

    Register-ObjectEvent -InputObject $script:timer -EventName Elapsed -Action {
        $changedFile = $script:lastEvent
        Write-Host "`n📝 تغيير في: $([System.IO.Path]::GetFileName($changedFile))" -ForegroundColor Yellow
        Write-Host "🔄 جاري الإرسال إلى GitHub..." -ForegroundColor Cyan

        Set-Location $using:projectPath
        git add -A -- ':!First Schedule.htm' ':!Schedule2.htm' 2>$null
        $status = git status --porcelain
        if ($status) {
            $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
            git commit -m "auto: update $timestamp" 2>&1 | Out-Null
            git push origin master 2>&1 | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ تم الرفع! GitHub Actions هيبني الموقع خلال دقيقة..." -ForegroundColor Green
            } else {
                Write-Host "❌ فشل الرفع — تحقق من الاتصال" -ForegroundColor Red
            }
        } else {
            Write-Host "ℹ  لا توجد تغييرات جديدة" -ForegroundColor Gray
        }
    } | Out-Null

    $script:timer.Start()
}

Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action | Out-Null
Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action | Out-Null

$watcher.EnableRaisingEvents = $true

Write-Host "✅ جاهز! أي تعديل في الكود هيترفع أوتوماتيك." -ForegroundColor Green
Write-Host "اضغط Ctrl+C للإيقاف`n" -ForegroundColor DarkGray

while ($true) { Start-Sleep -Seconds 1 }
