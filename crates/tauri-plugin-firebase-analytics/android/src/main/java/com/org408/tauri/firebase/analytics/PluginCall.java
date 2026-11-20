package com.org408.tauri.firebase.analytics;

import android.util.Log;
import app.tauri.plugin.Invoke;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * The @capacitor-firebase plugins are written against Capacitor's PluginCall, JSObject and JSArray. These are the parts of
 * them they use, with Capacitor's behaviour, on Tauri's Invoke, so the plugins' code stays theirs.
 *
 * The arguments are the object the page sent (what PluginCall.getData() holds). A rejection carries a message and,
 * for "not implemented" and "not available", a code; the page gets { code, message }, what Capacitor rejects with.
 */
class PluginCall {

    private final Invoke invoke;
    private final JSObject data;

    PluginCall(Invoke invoke) {
        this.invoke = invoke;
        JSObject parsed;
        try {
            parsed = new JSObject(invoke.getRawArgs());
        } catch (JSONException ex) {
            parsed = new JSObject();
        }
        this.data = parsed;
    }

    public boolean hasOption(String name) {
        return data.has(name) && !data.isNull(name);
    }

    public String getString(String name) {
        return getString(name, null);
    }

    public String getString(String name, String defaultValue) {
        Object value = data.opt(name);
        return value instanceof String ? (String) value : defaultValue;
    }

    public Integer getInt(String name) {
        return getInt(name, null);
    }

    public Integer getInt(String name, Integer defaultValue) {
        Object value = data.opt(name);
        return value instanceof Integer ? (Integer) value : defaultValue;
    }

    public Long getLong(String name, Long defaultValue) {
        Object value = data.opt(name);
        if (value instanceof Long) return (Long) value;
        if (value instanceof Integer) return ((Integer) value).longValue();
        return defaultValue;
    }

    public Float getFloat(String name) {
        Object value = data.opt(name);
        return value instanceof Number ? ((Number) value).floatValue() : null;
    }

    public Double getDouble(String name) {
        Object value = data.opt(name);
        return value instanceof Number ? ((Number) value).doubleValue() : null;
    }

    public Boolean getBoolean(String name) {
        Object value = data.opt(name);
        return value instanceof Boolean ? (Boolean) value : null;
    }

    public JSObject getObject(String name) {
        Object value = data.opt(name);
        return value instanceof JSONObject ? JSObject.fromJSONObject((JSONObject) value) : null;
    }

    public JSArray getArray(String name, JSArray defaultValue) {
        Object value = data.opt(name);
        return value instanceof JSONArray ? new JSArray((JSONArray) value) : defaultValue;
    }

    public void resolve() {
        invoke.resolve();
    }

    public void resolve(JSObject result) {
        invoke.resolve(new app.tauri.plugin.JSObject(result.toString()));
    }

    public void reject(String message) {
        invoke.reject(message);
    }

    public void unimplemented(String message) {
        invoke.reject(message, "UNIMPLEMENTED");
    }

    public void unavailable(String message) {
        invoke.reject(message, "UNAVAILABLE");
    }
}
