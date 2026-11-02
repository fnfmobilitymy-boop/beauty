@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
docker info >nul 2>&1
if errorlevel 1 goto docker_error
for /f "delims=" %%t in ('docker info --format "{{.OSType}}"') do set "DOCKER_OS=%%t"
if not "%DOCKER_OS%"=="linux" goto docker_error
echo Preparing private local settings...
docker run --rm --mount "type=bind,source=%cd%,target=/repo" -w /repo node:24-bookworm-slim node scripts/local-config.mjs
if errorlevel 1 goto failed
echo Building approved runtime. The first run may take several minutes...
docker build -f Dockerfile.sandbox -t kd-runtime:local .
if errorlevel 1 goto failed
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml up --build -d
if errorlevel 1 goto failed
docker compose --env-file deploy/.private/local/compose.env -f deploy/compose.local.yml exec -T app node -e "(async()=>{for(let i=0;i<40;i++){try{const r=await fetch('http://127.0.0.1:3000/api/health');if(r.ok)process.exit(0)}catch{}await new Promise(r=>setTimeout(r,500))}process.exit(1)})()"
if errorlevel 1 goto failed
for /f "tokens=2 delims==" %%p in ('findstr /b "KD_LOCAL_PORT=" deploy\.private\local\compose.env') do set "LOCAL_PORT=%%p"
echo Frontend: http://127.0.0.1:%LOCAL_PORT%/
echo Coding studio: http://127.0.0.1:%LOCAL_PORT%/studio
echo Admin: http://127.0.0.1:%LOCAL_PORT%/admin
echo No AI key is included. Use the sample project to test without AI charges.
start "" "http://127.0.0.1:%LOCAL_PORT%/"
pause
exit /b 0
:docker_error
echo Install and open Docker Desktop first. Use Linux containers.
echo Then double-click Start-Local.cmd again.
pause
exit /b 1
:failed
echo Startup failed. Your data was not deleted. See the error above.
pause
exit /b 1
