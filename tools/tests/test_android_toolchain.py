"""Machine-local Android tools resolve without executing a compiler or signer."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SHELL = shutil.which("pwsh") or shutil.which("powershell")


@unittest.skipUnless(sys.platform == "win32" and SHELL, "Windows PowerShell fixture")
class AndroidToolchainTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="gridshard-android-tools-")
        self.addCleanup(self.temporary.cleanup)
        self.base = Path(self.temporary.name)
        self.java = self.base / "JDK with spaces"
        self.sdk = self.base / "SDK with spaces"
        for name in ("java.exe", "javac.exe", "keytool.exe", "jarsigner.exe"):
            target = self.java / "bin" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.touch()
        (self.java / "release").write_text('JAVA_VERSION="21.0.10"\n', encoding="utf-8")
        for name in ("aapt.exe", "apksigner.bat"):
            target = self.sdk / "build-tools" / "36.0.0" / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.touch()
        target = self.sdk / "platforms" / "android-36" / "android.jar"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.touch()

    @staticmethod
    def quoted(path):
        return "'" + str(path).replace("'", "''") + "'"

    def resolve(self, prefix="", explicit=True):
        command = "$ErrorActionPreference='Stop'; . " + self.quoted(ROOT / "tools/android-toolchain.ps1") + "; " + prefix
        command += "Resolve-GridshardAndroidToolchain"
        if explicit:
            command += " -JavaHome " + self.quoted(self.java) + " -AndroidSdkRoot " + self.quoted(self.sdk)
        command += " | ConvertTo-Json -Compress"
        return subprocess.run([SHELL, "-NoProfile", "-NonInteractive", "-Command", command], text=True, capture_output=True)

    def test_explicit_paths_support_spaces_without_home_account_dependency(self):
        result = self.resolve()
        self.assertEqual(result.returncode, 0, result.stderr)
        tools = json.loads(result.stdout)
        self.assertEqual(Path(tools["JavaHome"]), self.java)
        self.assertEqual(Path(tools["AndroidSdkRoot"]), self.sdk)
        self.assertEqual(Path(tools["ApkSigner"]), self.sdk / "build-tools/36.0.0/apksigner.bat")

    def test_environment_paths_are_used(self):
        result = self.resolve("$env:JAVA_HOME=" + self.quoted(self.java) + "; $env:ANDROID_HOME=" + self.quoted(self.sdk) + "; ", explicit=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(Path(json.loads(result.stdout)["AndroidSdkRoot"]), self.sdk)

    def test_java_8_fails_before_any_build(self):
        (self.java / "release").write_text('JAVA_VERSION="8.0.1"\n', encoding="utf-8")
        result = self.resolve()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("JDK 21", result.stderr)

    def test_incomplete_sdk_fails_closed(self):
        (self.sdk / "platforms/android-36/android.jar").unlink()
        result = self.resolve()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("platform 36", result.stderr)


if __name__ == "__main__":
    unittest.main()
