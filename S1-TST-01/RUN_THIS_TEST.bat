@echo off
setlocal
cd /d "%~dp0"
echo ======================================================
echo S1-TST-01 - Test plan and acceptance criteria
echo ======================================================
where npm.cmd >nul 2>&1 || (echo [ERROR] Node.js/npm is missing. Install Node.js. & pause & exit /b 1)
if not exist "node_modules\@playwright\test" (
  call npm.cmd install
  if errorlevel 1 (echo [ERROR] npm install failed. & pause & exit /b 1)
)
call npx.cmd playwright install chromium
if errorlevel 1 (echo [ERROR] Browser installation failed. & pause & exit /b 1)
if "01"=="06" if not defined HOPE_CLIENT_PATH echo [NOTE] For source checks set HOPE_CLIENT_PATH to the actual ERP Client directory.
echo [INFO] Start HOPE ERP separately at http://127.0.0.1:5174/main.html for browser tests.
call npx.cmd playwright test
set "result=%ERRORLEVEL%"
echo.
echo S1-TST-01 exit code: %result%
echo Review playwright-report for detailed results.
pause
exit /b %result%
