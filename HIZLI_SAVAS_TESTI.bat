@echo off
setlocal
cd /d "%~dp0"
echo ============================================================
echo GRIDSHARD 2.0.0-beta.25 - HIZLI SAVAS TESTI
echo ============================================================
start "GRIDSHARD Web Test Sunucusu" cmd /c ""%~dp0BASLAT_WEB_TEST.bat""
timeout /t 4 /nobreak >nul
start "" "http://127.0.0.1:8000/"
echo Tarayici acildi. Ana Menu > Oyna > Savas Alanini Hemen Ac yolunu kullan.
exit /b 0
