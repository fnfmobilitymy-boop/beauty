@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml stop
echo Local containers stopped. Account and project data are preserved.
pause
