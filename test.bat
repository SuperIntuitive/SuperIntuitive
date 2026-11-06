@echo off
setlocal
set "test_php="
for /f "delims=" %%P in ('where php.exe 2^>nul') do if not defined test_php set "test_php=%%P"
if not defined test_php (
    echo ERROR: PHP CLI is required. Add PHP to PATH before running tests. 1>&2
    exit /b 2
)
set "test_php_options="
"%test_php%" -r "exit(extension_loaded('zip') ? 0 : 1);" >nul 2>&1
if errorlevel 1 (
    for %%P in ("%test_php%") do if exist "%%~dpPext\php_zip.dll" set test_php_options=-d "extension_dir=%%~dpPext" -d extension=zip
)
"%test_php%" %test_php_options% "%~dp0tests\Run.php" %*
exit /b %errorlevel%
