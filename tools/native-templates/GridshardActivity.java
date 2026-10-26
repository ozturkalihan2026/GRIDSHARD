package com.gridshard.nativeui;

import android.graphics.Color;
import android.os.Bundle;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.WebView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

/** Camera-safe top, edge-to-edge bottom; transient bars never move the game dock. */
public class GridshardActivity extends BridgeActivity {
    private boolean keyboardVisible = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(GridshardPlayGames.class);
        registerPlugin(GridshardAdSafety.class);
        super.onCreate(savedInstanceState);
        // Configure the window even when Capacitor falls back to its no-WebView
        // screen. AndroidX owns API-specific cutout/color compatibility; our
        // listener below remains the single owner of game/keyboard padding.
        WindowCompat.enableEdgeToEdge(getWindow());
        if (getBridge() == null) return;
        // The system font-size setting scales WebView text by default. The game
        // UI is laid out in fixed cells, so scaled labels spill out of their
        // boxes; keep text at the designed size.
        getBridge().getWebView().getSettings().setTextZoom(100);
        View viewport = (View) getBridge().getWebView().getParent();
        viewport.setBackgroundColor(Color.rgb(7, 20, 43));
        getWindow().getDecorView().setBackgroundColor(Color.rgb(7, 20, 43));
        ViewCompat.setOnApplyWindowInsetsListener(viewport, (view, insets) -> {
            int safeTypes = WindowInsetsCompat.Type.statusBars()
                | WindowInsetsCompat.Type.captionBar() | WindowInsetsCompat.Type.displayCutout();
            int consumedTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            // Reserve the camera/status area, never the bottom navigation bar.
            // Revealing transient bars must overlay the game, not resize it.
            // Native padding also works with WebViews that report CSS env() as 0.
            Insets safe = insets.getInsetsIgnoringVisibility(safeTypes);
            Insets keyboard = insets.getInsets(WindowInsetsCompat.Type.ime());
            keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());
            view.setPadding(safe.left, safe.top, safe.right,
                keyboardVisible ? keyboard.bottom : 0);
            // Consume navigation too: neither WebView nor CSS may reserve it.
            // Only an actual input keyboard reduces the available bottom area.
            return new WindowInsetsCompat.Builder(insets)
                .setInsets(consumedTypes | WindowInsetsCompat.Type.ime(), Insets.NONE)
                .setInsetsIgnoringVisibility(consumedTypes, Insets.NONE)
                .setDisplayCutout(null)
                .build();
        });
        getBridge().addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView view, String url) {
                ViewCompat.requestApplyInsets(viewport);
            }
        });
        ViewCompat.requestApplyInsets(viewport);
        restoreGameFullscreen();
    }

    private void restoreGameFullscreen() {
        if (keyboardVisible || getBridge() == null) return;
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(
            getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        controller.hide(WindowInsetsCompat.Type.systemBars());
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent event) {
        boolean handled = super.dispatchTouchEvent(event);
        // Do not consume the touch or close an active input keyboard.
        if (event.getActionMasked() == MotionEvent.ACTION_UP) restoreGameFullscreen();
        return handled;
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) restoreGameFullscreen();
    }

    @Override
    public void onResume() {
        super.onResume();
        restoreGameFullscreen();
    }
}
