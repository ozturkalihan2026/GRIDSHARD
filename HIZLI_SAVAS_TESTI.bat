@echo off
setlocal
cd /d "%~dp0"
chcp 65001 >nul

set "GRIDSHARD_EXPECTED_VERSION=2.0.0-beta.36"

echo ============================================================
echo GRIDSHARD %GRIDSHARD_EXPECTED_VERSION% - HIZLI SAVAS TESTI
echo ============================================================

rem Kullanici port belirtmediyse 8000-8010 arasinda ilk bos portu sec.
rem Boylece eski bir GRIDSHARD surumu 8000'de acik kalsa bile Beta.33 ona baglanmaz.
if not defined GRIDSHARD_WEB_PORT (
  for /f "usebackq delims=" %%P in (`powershell -NoProfile -ExecutionPolicy Bypass -Command "$selected=$null; for($p=8000;$p -le 8010;$p++){ $listener=$null; try { $listener=[System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback,$p); $listener.Start(); $listener.Stop(); $selected=$p; break } catch { if($listener){ try{$listener.Stop()}catch{} } } }; if($null -ne $selected){ Write-Output $selected }"`) do set "GRIDSHARD_WEB_PORT=%%P"
)

if not defined GRIDSHARD_WEB_PORT (
  echo [HATA] 8000-8010 araliginda bos GRIDSHARD test portu bulunamadi.
  echo Acik test sunucularini kapatip yeniden deneyin veya GRIDSHARD_WEB_PORT belirleyin.
  exit /b 1
)

echo [GRIDSHARD] Beta.33 test portu: %GRIDSHARD_WEB_PORT%
start "GRIDSHARD Web Test Sunucusu" cmd /k call "%~dp0BASLAT_WEB_TEST.bat"

rem Tarayiciyi yalnizca secilen port gercekten Beta.33 /health yaniti verirse ac.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$url='http://127.0.0.1:%GRIDSHARD_WEB_PORT%/health'; for($i=0;$i -lt 120;$i++){ try { $r=Invoke-RestMethod -Uri $url -TimeoutSec 2; if($r.version -eq '%GRIDSHARD_EXPECTED_VERSION%'){ exit 0 }; if($r.version){ Write-Host ('[HATA] Beklenen %GRIDSHARD_EXPECTED_VERSION%, bulunan ' + $r.version); exit 2 } } catch {}; Start-Sleep -Milliseconds 500 }; exit 1"
set "GRIDSHARD_HEALTH_EXIT=%ERRORLEVEL%"

if "%GRIDSHARD_HEALTH_EXIT%"=="2" (
  echo [HATA] Secilen portta farkli bir GRIDSHARD surumu calisiyor. Tarayici acilmadi.
  exit /b 1
)

if not "%GRIDSHARD_HEALTH_EXIT%"=="0" (
  echo [HATA] GRIDSHARD %GRIDSHARD_EXPECTED_VERSION% sunucusu %GRIDSHARD_WEB_PORT% portunda dogrulanamadi.
  echo Tarayici acilmadi. Sunucu penceresindeki hata mesajini kontrol edin.
  exit /b 1
)

start "" "http://127.0.0.1:%GRIDSHARD_WEB_PORT%/"
echo Tarayici dogrulanmis Beta.33 sunucusunda acildi: http://127.0.0.1:%GRIDSHARD_WEB_PORT%/
echo Ana Menu ^> Oyna ^> Hazir Havuzu Yukle ^> Eslestir yolunu kullan.
echo 10 saniyede cevrimici rakip bulunamazsa sunucu AI oyuncusu devralir.
exit /b 0
