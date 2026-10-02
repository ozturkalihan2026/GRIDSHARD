const localDebug = process.env.GRIDSHARD_LOCAL_DEBUG === "1";
const appId = localDebug ? "com.gridshard.localdebug" : (process.env.GRIDSHARD_APP_ID || "com.gridshardgame.app");

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId,
  appName: "GRIDSHARD",
  webDir: "dist",
  backgroundColor: "#07142B",
  server: {
    androidScheme: "https",
    ...(localDebug ? { cleartext: true } : {})
  },
  android: {
    ...(localDebug ? { path: ".mobile-debug/android" } : {}),
    allowMixedContent: localDebug
  },
  plugins: {
    SystemBars: {
      hidden: true,
      insetsHandling: "css"
    },
    PushNotifications: {
      presentationOptions: ["sound", "alert"]
    }
  }
};
