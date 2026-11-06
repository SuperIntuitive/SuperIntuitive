@echo off
setlocal
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0packaging\package.ps1" %*
set "package_result=%errorlevel%"
if not "%package_result%"=="0" echo Packaging failed. See the error above.
exit /b %package_result%
