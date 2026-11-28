package com.org408.tauri.firebase.messaging;

import org.json.JSONException;
import org.json.JSONObject;

/** Capacitor's JSObject: a JSONObject whose getters give null for a missing key instead of throwing */
class JSObject extends JSONObject {

    JSObject() {
        super();
    }

    JSObject(String json) throws JSONException {
        super(json);
    }

    static JSObject fromJSONObject(JSONObject object) {
        try {
            return new JSObject(object.toString());
        } catch (JSONException ex) {
            return new JSObject();
        }
    }

    @Override
    public JSObject put(String key, Object value) {
        try {
            super.put(key, value);
        } catch (JSONException ex) {
            // as Capacitor's: the value cannot be put
        }
        return this;
    }

    @Override
    public JSObject put(String key, boolean value) {
        try {
            super.put(key, value);
        } catch (JSONException ex) {
            // as Capacitor's
        }
        return this;
    }

    @Override
    public JSObject put(String key, int value) {
        try {
            super.put(key, value);
        } catch (JSONException ex) {
            // as Capacitor's
        }
        return this;
    }

    @Override
    public JSObject put(String key, long value) {
        try {
            super.put(key, value);
        } catch (JSONException ex) {
            // as Capacitor's
        }
        return this;
    }

    @Override
    public JSObject put(String key, double value) {
        try {
            super.put(key, value);
        } catch (JSONException ex) {
            // as Capacitor's
        }
        return this;
    }

    /** Capacitor's: the string, or null when the key is missing or not a string */
    @Override
    public String getString(String key) {
        return getString(key, null);
    }

    public String getString(String key, String defaultValue) {
        Object value = opt(key);
        return value instanceof String ? (String) value : defaultValue;
    }
}
