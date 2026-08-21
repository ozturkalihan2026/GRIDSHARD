const appId = process.env.GRIDSHARD_APP_ID || "com.example.gridshard";

/** @type {import('@capacitor/cli').CapacitorConfig} */
module.exports = {
  appId,
  appName: "GRIDSHARD",
  webDir: "dist",
  server: {
    androidScheme: "https"
  },
  android: {
    allowMixedContent: false
  }
};
