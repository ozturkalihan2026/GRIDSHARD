@echo off
setlocal
cd /d "%~dp0"

echo ============================================================
echo GRIDSHARD 2.0.0-beta.24 - Gercek Tarayici E2E
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
set E2E_RC=%errorlevel%

".venv\Scripts\python.exe" tools\browser_e2e_evidence.py
".venv\Scripts\python.exe" tools\ux_interaction_matrix.py

if not "%E2E_RC%"=="0" (
  echo.
  echo [BASARISIZ] Ayrintilar: qa_reports\browser_e2e.json
  echo Artifactler: qa_reports\browser_e2e_artifacts\
  exit /b 1
)

echo.
".venv\Scripts\python.exe" tools\export_browser_e2e_evidence.py

echo [BASARILI] Rapor: qa_reports\browser_e2e.json
echo Kanit Ozeti: qa_reports\browser_e2e_evidence_summary.json
echo UX Matrisi: qa_reports\ux_interaction_matrix.json
echo Tasinabilir Kanit ZIP: qa_reports\gridshard-windows-browser-e2e-evidence.zip
echo Artifactler: qa_reports\browser_e2e_artifacts\
exit /b 0
