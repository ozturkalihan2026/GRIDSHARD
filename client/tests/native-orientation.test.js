const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {androidPortrait, iosPortrait} = require("../../tools/configure-native-orientation.js");

const ANDROID_MANIFEST = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:label="@string/app_name">
        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize"
            android:name=".MainActivity"
            android:exported="true">
        </activity>
        <activity android:name="com.example.OAuthActivity" android:screenOrientation="sensor" />
    </application>
</manifest>
`;

const IOS_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
	</array>
	<key>UISupportedInterfaceOrientations~ipad</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationPortraitUpsideDown</string>
	</array>
</dict>
</plist>
`;

test("Android kilidi yalnız MainActivity'ye uygulanır ve tekrar çalıştırılabilir", () => {
  const once = androidPortrait(ANDROID_MANIFEST);
  const main = once.match(/<activity\b[^>]*MainActivity[^>]*>/)[0];
  assert.equal((main.match(/screenOrientation/g) || []).length, 1);
  assert.match(main, /android:screenOrientation="portrait">$/);
  assert.match(once, /OAuthActivity" android:screenOrientation="sensor"/);
  assert.equal(androidPortrait(once), once);
});

test("Android şablonunda MainActivity yoksa sessizce devam edilmez", () => {
  assert.throws(() => androidPortrait("<manifest><application></application></manifest>"));
});

test("iOS kilidi telefon ve iPad yönlerini yalnız portreye indirir", () => {
  const once = iosPortrait(IOS_PLIST);
  assert.doesNotMatch(once, /Landscape|UpsideDown/);
  assert.equal((once.match(/UIInterfaceOrientationPortrait</g) || []).length, 2);
  assert.match(once, /<key>UIRequiresFullScreen<\/key>\s*<true\/>/);
  assert.equal(iosPortrait(once), once);
});

test("Web manifesti ve Capacitor kancası portre yönünü korur", () => {
  const root = path.resolve(__dirname, "..", "..");
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "client", "manifest.webmanifest"), "utf8"));
  assert.equal(manifest.orientation, "portrait");
  const scripts = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts;
  assert.match(scripts["capacitor:sync:after"], /configure-native-orientation\.js/);
  assert.match(scripts["mobile:add:android"], /configure-native-orientation\.js android$/);
  assert.match(scripts["mobile:add:ios"], /configure-native-orientation\.js ios$/);
});
