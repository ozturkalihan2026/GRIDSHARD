const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {androidPortrait, androidLocalDebugNetwork, androidDebugAdMob, iosPortrait} = require("../../tools/configure-native-orientation.js");

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

test("yerel debug HTTP izni yalnız uygulamaya eklenir, yedek kapatılır", () => {
  const once = androidLocalDebugNetwork(ANDROID_MANIFEST);
  assert.match(once, /<application[^>]*android:usesCleartextTraffic="true"[^>]*android:allowBackup="false"/);
  assert.equal(androidLocalDebugNetwork(once), once);
});

test("HTTPS debug/release manifesti önceki LAN iznini kaldırır", () => {
  const lan = androidLocalDebugNetwork(ANDROID_MANIFEST);
  const https = androidLocalDebugNetwork(lan, false);
  assert.match(https, /android:usesCleartextTraffic="false"/);
  assert.match(https, /android:allowBackup="false"/);
  assert.doesNotMatch(https, /android:usesCleartextTraffic="true"/);
  assert.equal((https.match(/usesCleartextTraffic/g) || []).length, 1);
  assert.equal(androidLocalDebugNetwork(https, false), https);
  assert.equal(androidLocalDebugNetwork(https, true), lan);
});

test("debug AdMob SDK açılışı yalnız resmi örnek kimlikle yapılandırılır", () => {
  const once = androidDebugAdMob(ANDROID_MANIFEST);
  assert.match(once, /ca-app-pub-3940256099942544~3347511713/);
  assert.equal(androidDebugAdMob(once), once);
  assert.equal((once.match(/com\.google\.android\.gms\.ads\.APPLICATION_ID/g) || []).length, 1);
  const old = once.replace("ca-app-pub-3940256099942544~3347511713", "ca-app-pub-1111111111111111~1111111111");
  assert.equal(androidDebugAdMob(old), once);
  assert.throws(() => androidDebugAdMob("<manifest/>"), /tek application/);
  assert.throws(() => androidDebugAdMob(once.replace("</application>", '<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="duplicate" /></application>')), /yinelenmiş/);
});

test("iOS kilidi telefon ve iPad yönlerini yalnız portreye indirir", () => {
  const once = iosPortrait(IOS_PLIST);
  assert.doesNotMatch(once, /Landscape|UpsideDown/);
  assert.equal((once.match(/UIInterfaceOrientationPortrait</g) || []).length, 2);
  assert.match(once, /<key>UIRequiresFullScreen<\/key>\s*<true\/>/);
  assert.equal(iosPortrait(once), once);
});

test("debug AdMob sync does not swallow activities or FileProvider metadata", () => {
  const source = ANDROID_MANIFEST.replace("</application>", `<provider android:name="androidx.core.content.FileProvider">
      <meta-data android:name="android.support.FILE_PROVIDER_PATHS" android:resource="@xml/file_paths"></meta-data>
    </provider></application>`);
  const once = androidDebugAdMob(source);
  assert.equal(androidDebugAdMob(once), once);
  assert.equal(androidDebugAdMob(androidDebugAdMob(once)), once);
  assert.match(once, /android:name="\.MainActivity"/);
  assert.match(once, /androidx\.core\.content\.FileProvider/);
  assert.match(once, /android\.support\.FILE_PROVIDER_PATHS/);
  assert.equal((once.match(/<activity\b/g) || []).length, 2);
  assert.equal((once.match(/<\/provider>/g) || []).length, 1);
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
