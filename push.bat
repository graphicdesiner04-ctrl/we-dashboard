@echo off
:: WE Support Dashboard — Quick push to GitHub
:: Run this file any time you want to sync changes

cd /d "%~dp0"

git add -A

:: Use timestamp as default message if none provided
set MSG=%*
if "%MSG%"=="" set MSG=update: %date% %time%

git commit -m "%MSG%"
git push origin main

echo.
echo Done! Changes pushed to GitHub.
pause
