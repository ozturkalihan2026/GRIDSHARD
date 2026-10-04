package com.gridshard.nativeui;

import android.os.Handler;
import android.os.Looper;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.games.PlayGames;
import com.google.android.gms.games.GamesSignInClient;

/** Codes are returned in memory only; no tokens, email, player ID or logging. */
@CapacitorPlugin(name = "GridshardPlayGames")
public class GridshardPlayGames extends Plugin {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private PluginCall active;
    private Runnable timeout;

    private String resource(String name) {
        int id = getContext().getResources().getIdentifier(name, "string", getContext().getPackageName());
        return id == 0 ? "" : getContext().getString(id);
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("configured", !resource("gridshard_play_games_id").isEmpty()
            && !resource("gridshard_play_games_server_client_id").isEmpty());
        result.put("gameId", resource("gridshard_play_games_id"));
        result.put("serverClientId", resource("gridshard_play_games_server_client_id"));
        call.resolve(result);
    }

    @PluginMethod
    public void signIn(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (active != null) { call.reject("Play Games girişi zaten sürüyor."); return; }
            String client = resource("gridshard_play_games_server_client_id");
            if (client.isEmpty() || resource("gridshard_play_games_id").isEmpty()) {
                call.reject("Play Games uygulamada henüz hazır değil."); return;
            }
            active = call;
            timeout = () -> fail(call, null);
            handler.postDelayed(timeout, 120000);
            GamesSignInClient games = PlayGames.getGamesSignInClient(getActivity());
            games.isAuthenticated().addOnCompleteListener(task -> {
                if (active != call) return;
                if (!task.isSuccessful()) { fail(call, task.getException()); return; }
                if (task.getResult().isAuthenticated()) { requestCode(games, client, call); return; }
                if (!Boolean.TRUE.equals(call.getBoolean("interactive", true))) {
                    fail(call, null); return;
                }
                games.signIn().addOnCompleteListener(login -> {
                    if (active != call) return;
                    if (!login.isSuccessful() || !login.getResult().isAuthenticated()) {
                        fail(call, login.getException()); return;
                    }
                    requestCode(games, client, call);
                });
            });
        });
    }

    private void requestCode(GamesSignInClient games, String client, PluginCall call) {
        games.requestServerSideAccess(client, false).addOnCompleteListener(task -> {
            if (active != call) return;
            if (!task.isSuccessful() || task.getResult() == null || task.getResult().isEmpty()) {
                fail(call, task.getException()); return;
            }
            JSObject result = new JSObject();
            result.put("code", task.getResult());
            clear();
            call.resolve(result);
        });
    }

    private void fail(PluginCall call, Exception error) {
        if (active != call) return;
        String code = error instanceof ApiException ? String.valueOf(((ApiException) error).getStatusCode()) : "unavailable";
        clear();
        call.reject("Play Games girişi tamamlanamadı. Misafir olarak devam edebilirsin.", code);
    }

    private void clear() {
        if (timeout != null) handler.removeCallbacks(timeout);
        timeout = null;
        active = null;
    }

    @Override
    protected void handleOnDestroy() {
        if (active != null) fail(active, null);
        super.handleOnDestroy();
    }
}
