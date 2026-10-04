package com.gridshard.nativeui;

import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;

/** No request/show/reward method; validates release identity or SDK test device. */
@CapacitorPlugin(name = "GridshardAdSafety")
public class GridshardAdSafety extends Plugin {
    private String resource(String name) {
        int id = getContext().getResources().getIdentifier("gridshard_ad_" + name, "string", getContext().getPackageName());
        return id == 0 ? "" : getContext().getString(id);
    }

    private boolean configured() {
        try {
            ApplicationInfo info = getContext().getPackageManager().getApplicationInfo(getContext().getPackageName(), PackageManager.GET_META_DATA);
            String appId = resource("app_id");
            String unit = resource("ad_unit_id");
            if ((info.flags & ApplicationInfo.FLAG_DEBUGGABLE) == 0
                || !"com.gridshard.remotedebug".equals(getContext().getPackageName())
                || !"test".equals(resource("mode"))
                || !appId.matches("ca-app-pub-[0-9]{16}~[0-9]{10}")
                || !unit.matches("ca-app-pub-[0-9]{16}/[0-9]{10}")
                || !appId.split("~")[0].equals(unit.split("/")[0])
                || "ca-app-pub-3940256099942544~3347511713".equals(appId)
                || info.metaData == null || !appId.equals(info.metaData.getString("com.google.android.gms.ads.APPLICATION_ID"))) return false;
            String[] devices = resource("test_devices").split(",");
            if (devices.length == 0 || devices.length > 8) return false;
            for (String device : devices) if (!device.matches("[A-F0-9]{32}")) return false;
            return true;
        } catch (Exception ignored) { return false; }
    }

    @PluginMethod
    public void getTestSettings(PluginCall call) {
        if (!configured()) { call.reject("Publisher test configuration unavailable."); return; }
        JSObject result = new JSObject();
        JSArray devices = new JSArray();
        for (String device : resource("test_devices").split(",")) devices.put(device);
        result.put("mode", "test");
        result.put("adUnitId", resource("ad_unit_id"));
        result.put("testingDevices", devices);
        call.resolve(result);
    }

    @PluginMethod
    public void verifyLiveBuild(PluginCall call) {
        // A server toggle must never turn a debug/UMP-only package into a
        // live-ad client. Only the explicit production helper emits live mode.
        try {
            ApplicationInfo info = getContext().getPackageManager().getApplicationInfo(getContext().getPackageName(), PackageManager.GET_META_DATA);
            String appId = resource("app_id");
            String unit = resource("ad_unit_id");
            if ((info.flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0
                || !"com.gridshardgame.app".equals(getContext().getPackageName())
                || !"live".equals(resource("mode"))
                || !resource("test_devices").isEmpty()
                || !appId.matches("ca-app-pub-[0-9]{16}~[0-9]{10}")
                || !unit.matches("ca-app-pub-[0-9]{16}/[0-9]{10}")
                || !appId.split("~")[0].equals(unit.split("/")[0])
                || "ca-app-pub-3940256099942544~3347511713".equals(appId)
                || !unit.equals(call.getString("adId")) || info.metaData == null
                || !appId.equals(info.metaData.getString("com.google.android.gms.ads.APPLICATION_ID"))) {
                call.reject("Live advertising is not authorized in this build."); return;
            }
            JSObject result = new JSObject();
            result.put("verified", true);
            result.put("mode", "live");
            call.resolve(result);
        } catch (Exception ignored) { call.reject("Live advertising build could not be verified."); }
    }

    @PluginMethod
    public void verifyTestDevice(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            RequestConfiguration config = MobileAds.getRequestConfiguration();
            if (!configured() || !resource("ad_unit_id").equals(call.getString("adId"))
                || config.getTagForChildDirectedTreatment() != RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE
                || config.getTagForUnderAgeOfConsent() == RequestConfiguration.TAG_FOR_UNDER_AGE_OF_CONSENT_TRUE
                || !RequestConfiguration.MAX_AD_CONTENT_RATING_G.equals(config.getMaxAdContentRating())
                || !new AdRequest.Builder().build().isTestDevice(getContext())) {
                call.reject("Test device or child-safe SDK configuration not verified."); return;
            }
            JSObject result = new JSObject();
            result.put("verified", true);
            result.put("mode", "test");
            call.resolve(result);
        });
    }
}
