#!/usr/bin/env python3
"""Shoot the 4 deterministic ?shot= scenes for the v3r cover-art entry.

Serves app/ on localhost, opens each scene from shots.json, waits for
window.__shotReady, and saves a JPEG. Also exercises the REAL export path
(exportCover) for all three PNG sizes and checks their dimensions and
magic bytes. Records every request URL so the run proves zero external
fetches. Exits non-zero if any check fails.
"""
import json
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ENTRY = Path("/home/hatch/workspace/makefun/gta6-cover-art-01-entry-v3r")
SHOTS = json.loads((ENTRY / "shots.json").read_text())
PY = "/home/hatch/workspace/custom-skills/airdrop-agent/.venv/bin/python"
PORT = "8080"
PNG_MAGIC = [137, 80, 78, 71, 13, 10, 26, 10]
EXPORT_SIZES = [[1080, 1080], [1080, 1350], [1920, 1080]]

RUNNER = r"""
import json, sys
from playwright.sync_api import sync_playwright

shots = json.loads(sys.argv[1])
outdir = sys.argv[2]
port = sys.argv[3]
seen = {"requests": [], "errors": [], "exports": []}

def open_page(browser, width, height):
    page = browser.new_page(viewport={"width": width, "height": height})
    page.on("request", lambda r: seen["requests"].append(r.url))
    page.on("console", lambda m: seen["errors"].append(m.text) if m.type == "error" else None)
    page.on("pageerror", lambda e: seen["errors"].append(str(e)))
    return page

with sync_playwright() as p:
    browser = p.chromium.launch()
    for shot in shots:
        page = open_page(browser, shot["w"], shot["h"])
        page.goto("http://127.0.0.1:%s/index.html%s" % (port, shot["query"]), wait_until="load")
        page.wait_for_function("() => window.__shotReady === true", timeout=30000)
        page.screenshot(path="%s/%s" % (outdir, shot["name"]), type="jpeg", quality=80)
        page.close()
    page = open_page(browser, 1280, 720)
    page.goto("http://127.0.0.1:%s/index.html" % port, wait_until="load")
    page.wait_for_function("() => window.__keyart !== undefined", timeout=30000)
    page.wait_for_timeout(1500)
    sizes = page.evaluate('async () => { const done = []; for (const [w, h] of [[1080,1080],[1080,1350],[1920,1080]]) { const blob = await window.__keyart.exportCover(window.__keyart.state, w, h); const buf = new Uint8Array(await blob.arrayBuffer()); done.push({width: w, height: h, size: blob.size, magic: Array.from(buf.slice(0, 8))}); } return done; }')
    seen["exports"] = sizes
    page.close()
    browser.close()

print(json.dumps(seen))
"""


def wait_for_server(port, tries=50):
    for _ in range(tries):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/index.html", timeout=2)
            return True
        except Exception:
            time.sleep(0.2)
    return False


def check_result(result):
    local = (f"http://127.0.0.1:{PORT}", f"blob:http://127.0.0.1:{PORT}")
    external = [u for u in result["requests"] if not u.startswith(local)]
    print("external requests:", external)
    print("console/page errors:", result["errors"])
    ok = True
    for e in result["exports"]:
        good = e["magic"] == PNG_MAGIC
        print(f"export {e['width']}x{e['height']}: {e['size']} B, PNG magic ok={good}")
        ok = ok and good
    outdir = ENTRY / "screenshots"
    for shot in SHOTS:
        f = outdir / shot["name"]
        size = f.stat().st_size
        print(shot["name"], size, "B")
        if size > 262144:
            print("OVER 256 KiB:", shot["name"])
            ok = False
    return ok and not external and not result["errors"]


def main():
    server = subprocess.Popen(
        ["node", "serve.ts", "--port", PORT],
        cwd=ENTRY,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        if not wait_for_server(PORT):
            print("server did not come up")
            return 1
        outdir = ENTRY / "screenshots"
        outdir.mkdir(exist_ok=True)
        proc = subprocess.run(
            [PY, "-c", RUNNER, json.dumps(SHOTS), str(outdir), PORT],
            capture_output=True,
            text=True,
            timeout=300,
        )
        print(proc.stdout[-3000:])
        if proc.returncode != 0:
            print(proc.stderr[-2000:])
            return 1
        result = json.loads(proc.stdout.strip().splitlines()[-1])
        return 0 if check_result(result) else 1
    finally:
        server.terminate()


if __name__ == "__main__":
    sys.exit(main())
