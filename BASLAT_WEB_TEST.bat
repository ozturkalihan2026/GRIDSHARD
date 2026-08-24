@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

if defined GRIDSHARD_PYTHON_EXE if not exist "%GRIDSHARD_PYTHON_EXE%" (
  echo [HATA] GRIDSHARD_PYTHON_EXE bulunamadi: %GRIDSHARD_PYTHON_EXE%
  goto :fatal
)

rem Yarım kalmış bir sanal ortamda python.exe bulunup pyvenv.cfg bulunmayabilir.
rem Böyle bir klasörü hazır kabul etme; venv komutunun güvenle tamamlamasına izin ver.
if not defined GRIDSHARD_PYTHON_EXE if exist ".venv\Scripts\python.exe" if exist ".venv\pyvenv.cfg" set "GRIDSHARD_PYTHON_EXE=%~dp0.venv\Scripts\python.exe"

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
      goto :fatal
    )
    python -m venv .venv
  )
  if errorlevel 1 (
    echo [HATA] Python sanal ortami olusturulamadi.
    goto :fatal
  )
  set "GRIDSHARD_PYTHON_EXE=%~dp0.venv\Scripts\python.exe"
  "%~dp0.venv\Scripts\python.exe" -m pip install --upgrade pip
)

"%GRIDSHARD_PYTHON_EXE%" -c "import fastapi,uvicorn,redis,psycopg_pool" >nul 2>nul
if errorlevel 1 (
  echo [GRIDSHARD] Eksik veya guncellenmis sunucu paketleri kuruluyor...
  "%GRIDSHARD_PYTHON_EXE%" -m pip install -r server\requirements.txt
  if errorlevel 1 (
    echo [HATA] Sunucu paketleri kurulamadi.
    goto :fatal
  )
)

set RELAY_WEB_TEST_RUN_ID=web-test-beta.29-local
set RELAY_TELEMETRY_MAX_EVENTS=50000

rem Dogrudan cift tikla baslatildiginda da 8000-8010 arasinda ilk bos portu sec.
rem HIZLI_SAVAS_TESTI bir port belirlediyse o deger aynen korunur.
if not defined GRIDSHARD_WEB_PORT (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$selected=$null; for($p=8000;$p -le 8010;$p++){ $listener=$null; try { $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$p); $listener.Start(); $listener.Stop(); $selected=$p; break } catch { if($listener){ try{$listener.Stop()}catch{} } } }; if($null -ne $selected){ Write-Output $selected }"`) do set "GRIDSHARD_WEB_PORT=%%P"
)

if not defined GRIDSHARD_WEB_PORT (
  echo [HATA] 8000-8010 araliginda bos bir web test portu bulunamadi.
  goto :fatal
)

echo [GRIDSHARD] Kullanilacak web test portu: %GRIDSHARD_WEB_PORT%

"%GRIDSHARD_PYTHON_EXE%" tools\release_guard.py
if errorlevel 1 (
  echo [HATA] Surum on-kontrolu basarisiz oldu.
  goto :fatal
)

"%GRIDSHARD_PYTHON_EXE%" -c "import socket,sys;s=socket.socket();s.settimeout(.5);r=s.connect_ex(('127.0.0.1',int(sys.argv[1])));s.close();raise SystemExit(0 if r else 3)" "%GRIDSHARD_WEB_PORT%"
if errorlevel 3 (
  echo [HATA] 127.0.0.1:%GRIDSHARD_WEB_PORT% baska bir surec tarafindan kullaniliyor.
  echo Acik GRIDSHARD sunucusunu Ctrl+C ile durdurun veya GRIDSHARD_WEB_PORT degiskenini ayarlayin.
  goto :fatal
)

echo.
echo GRIDSHARD Web testi:
echo http://127.0.0.1:%GRIDSHARD_WEB_PORT%/
echo.
echo Sunucuyu durdurmak icin Ctrl+C kullan.
echo.

"%GRIDSHARD_PYTHON_EXE%" -m uvicorn server.app.main:app --host 127.0.0.1 --port %GRIDSHARD_WEB_PORT%
set "GRIDSHARD_SERVER_EXIT=%ERRORLEVEL%"

echo.
if not "%GRIDSHARD_SERVER_EXIT%"=="0" echo [HATA] Web test sunucusu %GRIDSHARD_SERVER_EXIT% koduyla durdu.
if "%GRIDSHARD_SERVER_EXIT%"=="0" echo [GRIDSHARD] Web test sunucusu durduruldu.
echo Bu pencereyi kapatmadan once yukaridaki son mesaji kontrol edebilirsiniz.
pause
exit /b %GRIDSHARD_SERVER_EXIT%

:fatal
echo.
echo [GRIDSHARD] Baslatma tamamlanamadi. Hata mesaji yukarida korunuyor.
pause
exit /b 1
