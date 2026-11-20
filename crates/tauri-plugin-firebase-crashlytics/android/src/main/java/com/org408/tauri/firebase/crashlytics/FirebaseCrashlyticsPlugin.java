// Derived from @capacitor-firebase/crashlytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
package com.org408.tauri.firebase.crashlytics;

import android.util.Log;
import app.tauri.plugin.Plugin;
import android.app.Activity;
import android.webkit.WebView;
import app.tauri.annotation.Command;
import app.tauri.annotation.TauriPlugin;
import app.tauri.plugin.Invoke;

@TauriPlugin
public class FirebaseCrashlyticsPlugin extends Plugin {

    public static final String TAG = "FirebaseCrashlytics";
    public static final String ERROR_MESSAGE_MISSING = "message must be provided.";
    public static final String ERROR_KEY_MISSING = "key must be provided.";
    public static final String ERROR_VALUE_MISSING = "value must be provided.";
    public static final String ERROR_USERID_MISSING = "userId must be provided.";
    public static final String ERROR_ENABLED_MISSING = "enabled must be provided.";
    private FirebaseCrashlytics implementation;

    public FirebaseCrashlyticsPlugin(Activity activity) {
        super(activity);
    }

    @Override
    public void load(WebView webView) {
        implementation = new FirebaseCrashlytics();
    }

    @Command
    public void crash(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        String message = call.getString("message");
        if (message == null) {
            call.reject(ERROR_MESSAGE_MISSING);
            return;
        }
        call.resolve();
        implementation.crash(message);
    }

    @Command
    public void setCustomKey(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String key = call.getString("key");
            if (key == null) {
                call.reject(ERROR_KEY_MISSING);
                return;
            }
            boolean hasValue = call.hasOption("value");
            if (!hasValue) {
                call.reject(ERROR_VALUE_MISSING);
                return;
            }
            String type = call.getString("type", "string");
            implementation.setCustomKey(key, type, call);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setUserId(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String userId = call.getString("userId");
            if (userId == null) {
                call.reject(ERROR_USERID_MISSING);
                return;
            }
            implementation.setUserId(userId);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void log(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String message = call.getString("message");
            if (message == null) {
                call.reject(ERROR_MESSAGE_MISSING);
                return;
            }
            implementation.log(message);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setEnabled(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            Boolean enabled = call.getBoolean("enabled");
            if (enabled == null) {
                call.reject(ERROR_ENABLED_MISSING);
                return;
            }
            implementation.setEnabled(enabled);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void isEnabled(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }

    @Command
    public void didCrashOnPreviousExecution(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            boolean crashed = implementation.didCrashOnPreviousExecution();
            JSObject ret = new JSObject();
            ret.put("crashed", crashed);
            call.resolve(ret);
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void sendUnsentReports(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.sendUnsentReports();
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void deleteUnsentReports(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.deleteUnsentReports();
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void recordException(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String message = call.getString("message");
            if (message == null) {
                call.reject(ERROR_MESSAGE_MISSING);
                return;
            }

            JSArray stacktrace = call.getArray("stacktrace", null);
            JSArray keysAndValues = call.getArray("keysAndValues", null);
            implementation.recordException(message, stacktrace, keysAndValues);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }
}
