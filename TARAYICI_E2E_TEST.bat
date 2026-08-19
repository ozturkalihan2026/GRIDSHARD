@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo GRIDSHARD 2.0.0-beta.19 - Gercek Tarayici E2E
echo ============================================================

if not exist ".venv\Scripts\python.exe" (
  echo [HATA] .venv bulunamadi.
  echo Once BASLAT_WEB_TEST.bat ile ortam kurulumunu tamamlayin.
  exit /b 1
)

".venv\Scripts\python.exe" -c "import playwright" >nul 2>&1
if errorlevel 1 (
  echo [EKSIK] Playwright Python paketi kurulu degil.
  echo Komut: .venv\Scripts\python.exe -m pip install playwright
  echo Ardindan: .venv\Scripts\python.exe -m playwright install chromium
  exit /b 1
)

echo Tarayici E2E baslatiliyor...
".venv\Scripts\python.exe" tools\browser_e2e.py

if errorlevel 1 (
  echo.
  echo [BASARISIZ] Ayrintilar: qa_reports\browser_e2e.json
  echo Artifactler: qa_reports\browser_e2e_artifacts\
  exit /b 1
)

echo.
echo [BASARILI] Rapor: qa_reports\browser_e2e.json
echo Artifactler: qa_reports\browser_e2e_artifacts\
exit /b 0
