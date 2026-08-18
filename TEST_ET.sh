#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r server/requirements.txt pytest
fi

command -v node >/dev/null 2>&1 || {
  echo "[HATA] Node.js bulunamadi. Client testleri icin Node.js gerekli."
  exit 1
}

exec .venv/bin/python tools/qa.py
