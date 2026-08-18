@echo off
setlocal
cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
  echo [Project Relay] QA icin sanal ortam hazirlaniyor...
  py -3.12 -m venv .venv
  if errorlevel 1 exit /b 1
  ".venv\Scripts\python.exe" -m pip install --upgrade pip
  ".venv\Scripts\python.exe" -m pip install -r server\requirements.txt pytest
  if errorlevel 1 exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo [HATA] Node.js bulunamadi. Client testleri icin Node.js gerekli.
  exit /b 1
)

".venv\Scripts\python.exe" tools\qa.py
exit /b %errorlevel%
