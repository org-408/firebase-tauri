// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
package com.org408.tauri.firebase.messaging;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import android.util.Log;
import android.webkit.WebView;
import androidx.annotation.NonNull;
import app.tauri.annotation.Command;
import app.tauri.annotation.Permission;
import app.tauri.annotation.TauriPlugin;
import app.tauri.plugin.Invoke;
import app.tauri.plugin.Plugin;
import com.google.firebase.messaging.RemoteMessage;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.json.JSONException;
import org.json.JSONObject;

// @capacitor-firebase/messaging: android/.../FirebaseMessagingPlugin.java
//
// The same plugin on Tauri: Capacitor's call is Tauri's `Invoke` wrapped in `PluginCall` (PluginCall.java), the permission
// is Tauri's (the alias `receive` is the key of the result, as in Capacitor), and `notifyListeners` is `trigger` on the
// channels the page registered. Events that come before the page listens are kept until it does, as Capacitor's
// `retainUntilConsumed`. Everything else is the Capacitor plugin's.
@TauriPlugin(
    permissions = { @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = FirebaseMessagingPlugin.PUSH_NOTIFICATIONS) }
)
public class FirebaseMessagingPlugin extends Plugin {

    public static final String PUSH_NOTIFICATIONS = "receive";

    public static final String TAG = "FirebaseMessaging";
    public static final String TOKEN_RECEIVED_EVENT = "tokenReceived";
    public static final String NOTIFICATION_RECEIVED_EVENT = "notificationReceived";
    public static final String NOTIFICATION_ACTION_PERFORMED_EVENT = "notificationActionPerformed";
    public static final String ERROR_NOTIFICATIONS_INVALID = "The provided notifications are invalid.";
    public static final String ERROR_TOPIC_MISSING = "topic must be provided.";
    public static final String ERROR_NOTIFICATIONS_MISSING = "notifications must be provided.";
    public static final String ERROR_ID_MISSING = "id must be provided.";
    public static final String ERROR_ID_OR_NAME_MISSING = "id and name must be provided.";
    // The service (a different class, started by Android) reaches the plugin through this, as Capacitor's staticBridge
    public static FirebaseMessagingPlugin instance = null;
    public static String lastToken = null;
    private static final List<RemoteMessage> pendingRemoteMessages = new ArrayList<>();
    // The notification whose tap was reported last: the launch intent is still there after the activity is recreated
    private static String lastActionMessageId = null;
    private final Map<String, List<JSObject>> retainedEvents = new HashMap<>();
    private final Activity activity;
    private FirebaseMessaging implementation;

    public FirebaseMessagingPlugin(Activity activity) {
        super(activity);
        this.activity = activity;
    }

    @Override
    public void load(WebView webView) {
        implementation = new FirebaseMessaging(activity);
        synchronized (pendingRemoteMessages) {
            instance = this;
            for (RemoteMessage remoteMessage : pendingRemoteMessages) {
                handleNotificationReceived(remoteMessage);
            }
            pendingRemoteMessages.clear();
        }

        if (lastToken != null) {
            handleTokenReceived(lastToken);
            lastToken = null;
        }

        // A tap on a notification while the app was closed starts the activity with the message in its intent, and
        // `onNewIntent` is not called for that (Capacitor's plugin only has `handleOnNewIntent`)
        Intent launchIntent = activity.getIntent();
        if (launchIntent != null) {
            handleNotificationIntent(launchIntent);
        }
    }

    /** Reports the tap on a notification that an intent carries, once per message */
    private void handleNotificationIntent(Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle != null && bundle.containsKey("google.message_id")) {
            String id = String.valueOf(bundle.get("google.message_id"));
            if (id.equals(lastActionMessageId)) {
                return;
            }
            lastActionMessageId = id;
            this.handleNotificationActionPerformed(bundle);
        }
    }

    @Override
    public void onNewIntent(Intent data) {
        super.onNewIntent(data);
        handleNotificationIntent(data);
    }

    public static void onNewToken(@NonNull String token) {
        FirebaseMessagingPlugin plugin = FirebaseMessagingPlugin.instance;
        if (plugin != null) {
            plugin.handleTokenReceived(token);
        } else {
            lastToken = token;
        }
    }

    public static void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        synchronized (pendingRemoteMessages) {
            FirebaseMessagingPlugin plugin = FirebaseMessagingPlugin.instance;
            if (plugin != null) {
                plugin.handleNotificationReceived(remoteMessage);
            } else {
                pendingRemoteMessages.add(remoteMessage);
            }
        }
    }

    @Override
    @Command
    public void checkPermissions(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("receive", "granted");
            call.resolve(result);
        } else {
            super.checkPermissions(invoke);
        }
    }

    @Override
    @Command
    public void requestPermissions(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            JSObject result = new JSObject();
            result.put("receive", "granted");
            call.resolve(result);
        } else {
            if (getPermissionStates().get(PUSH_NOTIFICATIONS) == app.tauri.PermissionState.GRANTED) {
                this.checkPermissions(invoke);
            } else {
                super.requestPermissions(invoke);
            }
        }
    }

    @Command
    public void isSupported(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        JSObject result = new JSObject();
        result.put("isSupported", true);
        call.resolve(result);
    }

    @Command
    public void getToken(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.getToken(
                new GetTokenResultCallback() {
                    @Override
                    public void success(String token) {
                        JSObject result = new JSObject();
                        result.put("token", token);
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
    public void deleteToken(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.deleteToken();
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void getDeliveredNotifications(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            JSArray notificationsResult = new JSArray();
            StatusBarNotification[] activeNotifications = implementation.getDeliveredNotifications();
            for (StatusBarNotification activeNotification : activeNotifications) {
                JSObject notificationResult = FirebaseMessagingHelper.createNotificationResult(activeNotification);
                notificationsResult.put(notificationResult);
            }

            JSObject result = new JSObject();
            result.put("notifications", notificationsResult);
            call.resolve(result);
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void removeDeliveredNotifications(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            JSArray notifications = call.getArray("notifications");
            if (notifications == null) {
                call.reject(ERROR_NOTIFICATIONS_MISSING);
                return;
            }

            List<String> tags = new ArrayList<>();
            List<String> ids = new ArrayList<>();
            try {
                for (Object item : notifications.toList()) {
                    if (item instanceof JSONObject) {
                        JSObject notification = JSObject.fromJSONObject((JSONObject) item);
                        String tag = notification.getString("tag", "");
                        tags.add(tag);
                        String id = notification.getString("id", "");
                        ids.add(id);
                    } else {
                        call.reject(ERROR_NOTIFICATIONS_INVALID);
                        return;
                    }
                }
            } catch (JSONException e) {
                call.reject(ERROR_NOTIFICATIONS_INVALID);
                return;
            }

            implementation.removeDeliveredNotifications(tags, ids);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void removeAllDeliveredNotifications(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            implementation.removeAllDeliveredNotifications();
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void subscribeToTopic(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String topic = call.getString("topic");
            if (topic == null) {
                call.reject(ERROR_TOPIC_MISSING);
                return;
            }
            implementation.subscribeToTopic(topic);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void unsubscribeFromTopic(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            String topic = call.getString("topic");
            if (topic == null) {
                call.reject(ERROR_TOPIC_MISSING);
                return;
            }
            implementation.unsubscribeFromTopic(topic);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void createChannel(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
                call.unavailable();
                return;
            }
            NotificationChannel notificationChannel = FirebaseMessagingHelper.createNotificationChannelFromPluginCall(
                call,
                activity.getPackageName()
            );
            if (notificationChannel == null) {
                call.reject(ERROR_ID_OR_NAME_MISSING);
                return;
            }
            implementation.createChannel(notificationChannel);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void deleteChannel(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
                call.unavailable();
                return;
            }
            String id = call.getString("id");
            if (id == null) {
                call.reject(ERROR_ID_MISSING);
                return;
            }

            implementation.deleteChannelById(id);
            call.resolve();
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    @Command
    public void listChannels(Invoke invoke) {
        PluginCall call = new PluginCall(invoke);
        try {
            if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.O) {
                call.unavailable();
                return;
            }
            List<NotificationChannel> notificationChannels = implementation.getNotificationChannels();
            JSArray channelsResult = new JSArray();
            for (NotificationChannel notificationChannel : notificationChannels) {
                JSObject channelResult = FirebaseMessagingHelper.createChannelResult(notificationChannel);
                channelsResult.put(channelResult);
            }
            JSObject result = new JSObject();
            result.put("channels", channelsResult);
            call.resolve(result);
        } catch (Exception exception) {
            Log.e(TAG, exception.getMessage(), exception);
            call.reject(exception.getMessage());
        }
    }

    // The page's listener for an event (`addListener`): Tauri keeps the channel; the events that came before it are sent now.
    // (These are not named `registerListener` / `removeListener` so that the iOS plugin, which cannot override those, has the
    // same commands.)
    @Command
    public void registerEventListener(Invoke invoke) {
        String event = new PluginCall(invoke).getString("event");
        super.registerListener(invoke);
        if (event != null) {
            List<JSObject> retained;
            synchronized (retainedEvents) {
                retained = retainedEvents.remove(event);
            }
            if (retained != null) {
                for (JSObject data : retained) {
                    notifyListeners(event, data, true);
                }
            }
        }
    }

    @Command
    public void removeEventListener(Invoke invoke) {
        super.removeListener(invoke);
    }

    /** Capacitor's notifyListeners(event, data, retainUntilConsumed) */
    private void notifyListeners(String event, JSObject data, boolean retainUntilConsumed) {
        if (hasListener(event)) {
            trigger(event, new app.tauri.plugin.JSObject(data.toString()));
        } else if (retainUntilConsumed) {
            synchronized (retainedEvents) {
                List<JSObject> retained = retainedEvents.get(event);
                if (retained == null) {
                    retained = new ArrayList<>();
                    retainedEvents.put(event, retained);
                }
                retained.add(data);
            }
        }
    }

    private void handleTokenReceived(@NonNull String token) {
        JSObject result = new JSObject();
        result.put("token", token);
        notifyListeners(TOKEN_RECEIVED_EVENT, result, true);
    }

    private void handleNotificationReceived(@NonNull RemoteMessage remoteMessage) {
        JSObject notificationResult = FirebaseMessagingHelper.createNotificationResult(remoteMessage);
        JSObject result = new JSObject();
        result.put("notification", notificationResult);
        notifyListeners(NOTIFICATION_RECEIVED_EVENT, result, true);
    }

    private void handleNotificationActionPerformed(@NonNull Bundle bundle) {
        JSObject notificationResult = FirebaseMessagingHelper.createNotificationResult(bundle);
        JSObject result = new JSObject();
        result.put("actionId", "tap");
        result.put("notification", notificationResult);
        notifyListeners(NOTIFICATION_ACTION_PERFORMED_EVENT, result, true);
    }
}
