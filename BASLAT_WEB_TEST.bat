@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [GRIDSHARD] Python sanal ortami hazirlaniyor...
  py -3.12 -m venv .venv
  if errorlevel 1 exit /b 1
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r server\requirements.txt
  if errorlevel 1 exit /b 1
)

set RELAY_WEB_TEST_RUN_ID=web-test-beta.14-local
set RELAY_TELEMETRY_MAX_EVENTS=50000

echo.
echo GRIDSHARD Web testi:
echo http://127.0.0.1:8000/
echo.
echo Sunucuyu durdurmak icin Ctrl+C kullan.
echo.

".venv\Scripts\python.exe" -m uvicorn server.app.main:app --host 127.0.0.1 --port 8000
