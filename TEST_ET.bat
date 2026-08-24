@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" goto :prepare_qa_venv
if not exist ".venv\pyvenv.cfg" goto :prepare_qa_venv
goto :qa_dependencies

:prepare_qa_venv
  echo [GRIDSHARD] QA icin sanal ortam hazirlaniyor...
  py -3.12 -m venv .venv
  if errorlevel 1 exit /b 1
  ".venv\Scripts\python.exe" -m pip install --upgrade pip

:qa_dependencies
".venv\Scripts\python.exe" -c "import fastapi,pytest,httpx2,fakeredis" >nul 2>nul
if errorlevel 1 (
  echo [GRIDSHARD] QA bagimliliklari kuruluyor...
  ".venv\Scripts\python.exe" -m pip install -r server\requirements-test.txt
  if errorlevel 1 exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Client testleri icin Node.js gerekli.
  exit /b 1
)

".venv\Scripts\python.exe" tools\release_guard.py
if errorlevel 1 exit /b 1

".venv\Scripts\python.exe" tools\qa.py
exit /b %errorlevel%
