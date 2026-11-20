// Derived from @capacitor-firebase/analytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
package com.org408.tauri.firebase.analytics;

import android.os.Bundle;
import androidx.annotation.Nullable;
import android.util.Log;
import app.tauri.plugin.Plugin;
import android.app.Activity;
import android.webkit.WebView;
import app.tauri.annotation.Command;
import app.tauri.annotation.TauriPlugin;
import app.tauri.plugin.Invoke;

@TauriPlugin
public class FirebaseAnalyticsPlugin extends Plugin {

    public static final String TAG = "FirebaseAnalytics";
    public static final String ERROR_KEY_MISSING = "key must be provided.";
    public static final String ERROR_ENABLED_MISSING = "enabled must be provided.";
    public static final String ERROR_NAME_MISSING = "name must be provided.";
    public static final String ERROR_CONSENT_TYPE_MISSING = "consentType must be provided.";
    public static final String ERROR_CONSENT_STATUS_MISSING = "consentStatus must be provided.";
    private FirebaseAnalytics implementation;

    private final Activity activity;

    public FirebaseAnalyticsPlugin(Activity activity) {
        super(activity);
        this.activity = activity;
    }

    @Override
    public void load(WebView webView) {
        implementation = new FirebaseAnalytics(activity);
    }

    @Command
    public void getAppInstanceId(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.getAppInstanceId(
                new GetAppInstanceIdCallback() {
                    @Override
                    public void success(@Nullable String appInstanceId) {
                        JSObject result = new JSObject();
                        if (appInstanceId != null) {
                            result.put("appInstanceId", appInstanceId);
                        }
                        call.resolve(result);
                    }

                    @Override
                    public void error(String message) {
                        call.reject(message);
                    }
                }
            );
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setConsent(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            com.google.firebase.analytics.FirebaseAnalytics.ConsentType consentType = FirebaseAnalyticsHelper.mapStringToConsentType(
                call.getString("type", null)
            );
            if (consentType == null) {
                call.reject(ERROR_CONSENT_TYPE_MISSING);
                return;
            }
            com.google.firebase.analytics.FirebaseAnalytics.ConsentStatus consentStatus = FirebaseAnalyticsHelper.mapStringToConsentStatus(
                call.getString("status", null)
            );
            if (consentStatus == null) {
                call.reject(ERROR_CONSENT_STATUS_MISSING);
                return;
            }
            implementation.setConsent(consentType, consentStatus);
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
            String userId = call.getString("userId", null);
            implementation.setUserId(userId);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setUserProperty(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String key = call.getString("key");
            if (key == null) {
                call.reject(ERROR_KEY_MISSING);
                return;
            }
            String value = call.getString("value", null);
            implementation.setUserProperty(key, value);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setCurrentScreen(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String screenName = call.getString("screenName", null);
            String screenClassOverride = call.getString("screenClassOverride", null);
            implementation.setCurrentScreen(screenName, screenClassOverride);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void logEvent(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String name = call.getString("name");
            if (name == null) {
                call.reject(ERROR_NAME_MISSING);
                return;
            }
            JSObject params = call.getObject("params");
            implementation.logEvent(name, params);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void setSessionTimeoutDuration(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            Long duration = call.getLong("duration", 1800000L);
            implementation.setSessionTimeoutDuration(duration);
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
    public void resetAnalyticsData(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.resetAnalyticsData();
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void logTransaction(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }

    @Command
    public void initiateOnDeviceConversionMeasurementWithEmailAddress(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }

    @Command
    public void initiateOnDeviceConversionMeasurementWithPhoneNumber(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }

    @Command
    public void initiateOnDeviceConversionMeasurementWithHashedEmailAddress(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }

    @Command
    public void initiateOnDeviceConversionMeasurementWithHashedPhoneNumber(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        call.unimplemented("Not implemented on Android.");
    }
}
