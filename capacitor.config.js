const localDebug = process.env.GRIDSHARD_LOCAL_DEBUG === "1";
const appId = localDebug ? "com.gridshard.localdebug" : (process.env.GRIDSHARD_APP_ID || "com.example.gridshard");

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId,
  appName: "GRIDSHARD",
  webDir: "dist",
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
