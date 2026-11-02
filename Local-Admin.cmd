@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
echo Register your account in the website first. This step restarts the local app.
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml stop app
if errorlevel 1 goto failed
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml run --rm app node admin-cli.mjs select
set "ADMIN_EXIT=%ERRORLEVEL%"
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml up -d app
if not "%ADMIN_EXIT%"=="0" echo Admin setup was cancelled or failed. Register first and try again.
echo Sign in again at the admin page. No password was generated for you.
pause
exit /b 0
:failed
echo Admin setup failed. Check Docker Desktop and start the local app first.
pause
exit /b 1
