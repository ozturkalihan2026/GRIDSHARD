#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  python3 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r server/requirements.txt
fi

export RELAY_WEB_TEST_RUN_ID="web-test-alpha.132-local"
export RELAY_TELEMETRY_MAX_EVENTS="50000"

echo "Project Relay Web testi: http://127.0.0.1:8000/"
echo "Sunucuyu durdurmak için Ctrl+C kullan."
exec .venv/bin/python -m uvicorn server.app.main:app --host 127.0.0.1 --port 8000
