package com.gridshard.nativeui;

import android.app.Application;
import com.google.android.gms.games.PlayGamesSdk;

public class GridshardApplication extends Application {
    @Override
    public void onCreate() {
        super.onCreate();
        int id = getResources().getIdentifier("gridshard_play_games_id", "string", getPackageName());
        if (id != 0 && !getString(id).isEmpty()) PlayGamesSdk.initialize(this);
    }
}
