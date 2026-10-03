const localDebug = process.env.GRIDSHARD_LOCAL_DEBUG === "1";
const remoteDebug = localDebug && process.env.GRIDSHARD_REMOTE_DEBUG === "1";
const { insecureLocalDebugForBuild } = require("./tools/mobile-network-policy.js");
const insecureLocalDebug = insecureLocalDebugForBuild(process.env);
const appId = localDebug ? (remoteDebug ? "com.gridshard.remotedebug" : "com.gridshard.localdebug")
  : (process.env.GRIDSHARD_APP_ID || "com.gridshardgame.app");

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId,
  appName: remoteDebug ? "GRIDSHARD TEST" : "GRIDSHARD",
  webDir: "dist",
  backgroundColor: "#07142B",
  server: {
    androidScheme: "https",
    cleartext: insecureLocalDebug
  },
  android: {
    ...(localDebug ? { path: remoteDebug ? ".mobile-debug/remote-android" : ".mobile-debug/android" } : {}),
    allowMixedContent: insecureLocalDebug
  },
  plugins: {
    App: { disableBackButtonHandler: true },
    SystemBars: {
      hidden: true,
      style: "DARK",
      // GridshardActivity owns camera padding; the bottom remains edge-to-edge.
      // Avoid Capacitor's visibility-dependent CSS/parent-padding adjustment.
      insetsHandling: "disable"
    },
    PushNotifications: {
      presentationOptions: ["sound", "alert"]
    }
  }
};
