@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo GRIDSHARD 2.0.0-beta.26 - Windows E2E Kanit Iceri Aktarim
echo ============================================================

if "%~1"=="" (
  echo Kullanim:
  echo   WINDOWS_E2E_KANIT_ICERI_AKTAR.bat "C:\Yol\gridshard-e2e-kanit.zip"
  echo.
  echo Kaynak ZIP veya browser_e2e.json iceren klasor olabilir.
  exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
  echo [HATA] .venv bulunamadi.
  exit /b 1
)

".venv\Scripts\python.exe" tools\import_browser_e2e_evidence.py --source "%~1"
set IMPORT_RC=%errorlevel%

echo.
echo Rapor: qa_reports\imported_browser_e2e.json

if not "%IMPORT_RC%"=="0" (
  echo [REDDEDILDI] Kanit paketi PASSED olarak kabul edilmedi.
  exit /b %IMPORT_RC%
)

".venv\Scripts\python.exe" tools\browser_e2e_history.py
".venv\Scripts\python.exe" tools\ux_interaction_matrix.py
".venv\Scripts\python.exe" tools\ux_performance_thresholds.py

echo [TAMAMLANDI] Kanit paketi dogrulandi veya SKIPPED durumu korundu.
exit /b 0
