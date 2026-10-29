@echo off
setlocal
pushd "%~dp0"
if errorlevel 1 exit /b 1
set "sipl_runtime=sipl.exe"
if defined SI_SIPL_RUNTIME (
    set "sipl_runtime=%SI_SIPL_RUNTIME%"
    if not exist "%SI_SIPL_RUNTIME%" goto missing_runtime
) else (
    where.exe sipl.exe >nul 2>&1
    if errorlevel 1 goto missing_runtime
)
echo Starting SuperIntuitive SIPL. Open http://localhost:8092
echo Press Ctrl+C to stop. Configuration: core_sipl\config.local.json
"%sipl_runtime%" run core_sipl/main.sipl
set "sipl_result=%errorlevel%"
popd
if not "%sipl_result%"=="0" pause
exit /b %sipl_result%

:missing_runtime
echo SIPL was not found. Install a runtime with MySQL/MariaDB and bcrypt support.
echo Add sipl.exe to PATH, or set SI_SIPL_RUNTIME to its full executable path.
popd
exit /b 1
