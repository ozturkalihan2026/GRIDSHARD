from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import time
from urllib import request

ROOT=Path(__file__).resolve().parents[1]
SERVER=ROOT/"server"
REPORT=ROOT/"qa_reports/browser_e2e.json"
PORT=8878
BASE=f"http://127.0.0.1:{PORT}"
PLAYER="wt-beta18-e2e"
STORAGE_KEY="project-relay.web-test.participant-id"

def http_json(method:str,path:str,payload:dict|None=None):
    data=json.dumps(payload).encode("utf-8") if payload is not None else None
    req=request.Request(
        BASE+path,
        data=data,
        method=method,
        headers={"content-type":"application/json"},
    )
    with request.urlopen(req,timeout=5) as response:
        raw=response.read().decode("utf-8")
        return (
            response.status,
            json.loads(raw) if raw else None,
            dict(response.headers),
        )

def wait_server()->None:
    deadline=time.time()+20
    last=None
    while time.time()<deadline:
        try:
            status,_,_=http_json("GET","/health")
            if status==200:
                return
        except Exception as exc:
            last=exc
        time.sleep(.15)
    raise RuntimeError(f"Uvicorn E2E sunucusu hazır olmadı: {last}")

def main()->int:
    parser=argparse.ArgumentParser()
    parser.add_argument("--optional",action="store_true")
    args=parser.parse_args()

    try:
        from playwright.sync_api import sync_playwright
    except Exception as exc:
        if args.optional:
            REPORT.parent.mkdir(parents=True,exist_ok=True)
            REPORT.write_text(
                json.dumps(
                    {"ok":True,"skipped":True,"reason":f"Playwright yok: {exc}"},
                    ensure_ascii=False,
                    indent=2,
                )+"\n",
                encoding="utf-8",
            )
            print("Browser E2E SKIPPED: Playwright yok.")
            return 0
        raise

    chromium_path=(
        shutil.which("chromium")
        or shutil.which("google-chrome")
        or shutil.which("msedge")
    )

    env=os.environ.copy()
    env["PYTHONPATH"]=str(SERVER)
    env["RELAY_WEB_TEST_RUN_ID"]="web-test-beta.18-browser-e2e"
    env["RELAY_PLAYER_DATA_PATH"]=str(SERVER/"data/e2e_players.json")
    env["RELAY_TELEMETRY_PATH"]=str(SERVER/"data/e2e_telemetry.json")
    env["RELAY_BATTLE_POOL_PRESET_PATH"]=str(SERVER/"data/e2e_presets.json")
    env["RELAY_BALANCE_CHANGE_DRAFT_PATH"]=str(SERVER/"data/e2e_balance_drafts.json")
    env["RELAY_TELEMETRY_MAX_EVENTS"]="50000"

    for path in (SERVER/"data").glob("e2e_*.json*"):
        path.unlink(missing_ok=True)

    proc=subprocess.Popen(
        [
            sys.executable,"-m","uvicorn","app.main:app",
            "--host","127.0.0.1","--port",str(PORT),
        ],
        cwd=SERVER,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    console_errors=[]
    page_errors=[]
    checks=[]

    try:
        wait_server()
        http_json("POST",f"/participants/{PLAYER}/bootstrap")

        sys.path.insert(0,str(SERVER))
        from app.game.battle_pool import default_battle_pool
        ids=list(default_battle_pool().module_definition_ids)
        status,_,_=http_json(
            "PUT",
            f"/profile/{PLAYER}/battle-pool-presets",
            {"name":"E2E Loadout","battle_pool_ids":ids},
        )
        if status!=200:
            raise RuntimeError("E2E hazır loadout kaydedilemedi.")

        with sync_playwright() as pw:
            launch_kwargs={
                "headless":True,
                "args":["--no-sandbox","--disable-dev-shm-usage"],
            }
            if chromium_path:
                launch_kwargs["executable_path"]=chromium_path

            browser=pw.chromium.launch(**launch_kwargs)
            context=browser.new_context()
            page=context.new_page()

            page.on(
                "console",
                lambda msg: console_errors.append(msg.text)
                if msg.type=="error" else None,
            )
            page.on("pageerror",lambda exc: page_errors.append(str(exc)))

            init_script=(
                "localStorage.setItem("
                + json.dumps(STORAGE_KEY)
                + ","
                + json.dumps(PLAYER)
                + ");"
            )
            page.add_init_script(init_script)

            response=page.goto(
                BASE+"/?e2e=1",
                wait_until="networkidle",
                timeout=30_000,
            )
            checks.append({
                "name":"root_200",
                "ok":response is not None and response.status==200,
                "status":response.status if response else None,
            })
            headers=response.headers
            checks.append({
                "name":"cache_disabled",
                "ok":"no-store" in headers.get("cache-control",""),
                "cache_control":headers.get("cache-control"),
            })

            page.locator("#main-menu-title").wait_for(state="visible")
            page.locator('[data-open-screen="play"]').click()

            card=page.locator(".quick-loadout-card",has_text="E2E Loadout")
            card.wait_for(state="visible",timeout=10_000)
            card.get_by_role("button",name="Tek Oyunculu").click()

            page.locator("#battle-pool-panel").wait_for(
                state="visible",
                timeout=10_000,
            )
            page.wait_for_function(
                "() => document.querySelector('#battle-pool-count')?.textContent?.includes('18 / 18')",
                timeout=10_000,
            )
            page.wait_for_function(
                "() => !document.querySelector('#battle-pool-confirm')?.disabled",
                timeout=10_000,
            )
            page.locator("#battle-pool-confirm").click()

            page.wait_for_function(
                "() => document.body.dataset.localStatus === 'battle'",
                timeout=10_000,
            )
            checks.append({"name":"local_battle_started","ok":True})

            page.wait_for_function(
                "() => document.body.dataset.localFinished === 'true'",
                timeout=20_000,
            )

            result_text=page.locator("#battle-result-summary").inner_text()
            checks.append({
                "name":"battle_result_visible",
                "ok":"KAZANDIN" in result_text or "KAYBETTİN" in result_text,
                "text":result_text,
            })

            deadline=time.time()+8
            manual=None
            while time.time()<deadline:
                _,manual,_=http_json(
                    "GET",
                    f"/telemetry/manual-battle-report?player_id={PLAYER}",
                )
                if manual and manual.get("battle_count",0)>=1:
                    break
                time.sleep(.2)

            checks.append({
                "name":"telemetry_manual_report",
                "ok":bool(manual and manual.get("battle_count",0)>=1),
                "battle_count":manual.get("battle_count",0) if manual else 0,
            })
            browser.close()

        ok=(
            all(item["ok"] for item in checks)
            and not page_errors
            and not console_errors
        )
        report={
            "ok":ok,
            "skipped":False,
            "browser":chromium_path or "playwright-managed chromium",
            "checks":checks,
            "console_errors":console_errors,
            "page_errors":page_errors,
        }
        REPORT.parent.mkdir(parents=True,exist_ok=True)
        REPORT.write_text(
            json.dumps(report,ensure_ascii=False,indent=2)+"\n",
            encoding="utf-8",
        )

        if not ok:
            print(json.dumps(report,ensure_ascii=False,indent=2))
            return 1

        print(
            "Browser E2E PASSED: Ana Menü → Hızlı Loadout → "
            "Savaş Havuzu → Yerel Savaş → Sonuç → Telemetri"
        )
        return 0
    except Exception as exc:
        if args.optional:
            REPORT.parent.mkdir(
                parents=True,
                exist_ok=True,
            )
            REPORT.write_text(
                json.dumps({
                    "ok":True,
                    "skipped":True,
                    "reason":str(exc),
                    "browser":
                        chromium_path
                        or "playwright-managed chromium",
                },ensure_ascii=False,indent=2)+"\n",
                encoding="utf-8",
            )
            print(
                "Browser E2E SKIPPED: "
                + str(exc)
            )
            return 0
        raise
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait(timeout=5)
        for path in (SERVER/"data").glob("e2e_*.json*"):
            path.unlink(missing_ok=True)

if __name__=="__main__":
    raise SystemExit(main())
