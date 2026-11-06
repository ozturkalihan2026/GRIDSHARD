const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

module.exports = async () => {
  if (process.env.GRIDSHARD_E2E_EXTERNAL_SERVER) return;
  const port = Number(new URL(process.env.GRIDSHARD_E2E_BASE_URL || 'http://127.0.0.1:8879').port || 80);
  const pidPath = path.resolve(__dirname, "..", "qa_reports", `e2e-server-${port}.pid.json`);
  if (!fs.existsSync(pidPath)) return;

  try {
    const evidence = JSON.parse(fs.readFileSync(pidPath, "utf8"));
    const pid = Number(evidence.pid);
    const ageMs = Date.now() - Number(evidence.started_at_ms || 0);
    if (!Number.isInteger(pid) || pid <= 0 || Number(evidence.port) !== port || ageMs < 0 || ageMs > 3_600_000) return;

    try {
      process.kill(pid, "SIGKILL");
    } catch (error) {
      if (error.code === "ESRCH") return;
      if (process.platform !== "win32") throw error;
      const fallback = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
        windowsHide: true,
        stdio: "ignore"
      });
      if (fallback.status !== 0) throw error;
    }
  } finally {
    fs.rmSync(pidPath, { force: true });
  }
};
