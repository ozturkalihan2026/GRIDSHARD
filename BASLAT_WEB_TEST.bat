@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

if defined GRIDSHARD_PYTHON_EXE if not exist "%GRIDSHARD_PYTHON_EXE%" (
  echo [HATA] GRIDSHARD_PYTHON_EXE bulunamadi: %GRIDSHARD_PYTHON_EXE%
  exit /b 1
)

if not defined GRIDSHARD_PYTHON_EXE if exist ".venv\Scripts\python.exe" set "GRIDSHARD_PYTHON_EXE=%~dp0.venv\Scripts\python.exe"

if not defined GRIDSHARD_PYTHON_EXE (
  echo [GRIDSHARD] Python sanal ortami hazirlaniyor...
  where py >nul 2>nul
  if not errorlevel 1 (
    py -3.12 -m venv .venv
    if errorlevel 1 py -3 -m venv .venv
  ) else (
    where python >nul 2>nul
    if errorlevel 1 (
      echo [HATA] Python bulunamadi. Python 3.12+ kurup yeniden deneyin.
      exit /b 1
    )
    python -m venv .venv
  )
  if errorlevel 1 exit /b 1
  set "GRIDSHARD_PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
  "%~dp0.venv\Scripts\python.exe" -m pip install --upgrade pip
)

"%GRIDSHARD_PYTHON_EXE%" -c "import fastapi,uvicorn,redis,psycopg_pool" >nul 2>nul
if errorlevel 1 (
  echo [GRIDSHARD] Eksik veya guncellenmis sunucu paketleri kuruluyor...
  "%GRIDSHARD_PYTHON_EXE%" -m pip install -r server\requirements.txt
  if errorlevel 1 exit /b 1
)

set RELAY_WEB_TEST_RUN_ID=web-test-beta.26-local
set RELAY_TELEMETRY_MAX_EVENTS=50000
if "%GRIDSHARD_WEB_PORT%"=="" set GRIDSHARD_WEB_PORT=8000

"%GRIDSHARD_PYTHON_EXE%" tools\release_guard.py
if errorlevel 1 exit /b 1

"%GRIDSHARD_PYTHON_EXE%" -c "import socket,sys;s=socket.socket();s.settimeout(.5);r=s.connect_ex(('127.0.0.1',int(sys.argv[1])));s.close();raise SystemExit(0 if r else 3)" "%GRIDSHARD_WEB_PORT%"
if errorlevel 3 (
  echo [HATA] 127.0.0.1:%GRIDSHARD_WEB_PORT% baska bir surec tarafindan kullaniliyor.
  echo Acik GRIDSHARD sunucusunu Ctrl+C ile durdurun veya GRIDSHARD_WEB_PORT degiskenini ayarlayin.
  exit /b 1
)

echo.
echo GRIDSHARD Web testi:
echo http://127.0.0.1:%GRIDSHARD_WEB_PORT%/
echo.
echo Sunucuyu durdurmak icin Ctrl+C kullan.
echo.

"%GRIDSHARD_PYTHON_EXE%" -m uvicorn server.app.main:app --host 127.0.0.1 --port %GRIDSHARD_WEB_PORT%
