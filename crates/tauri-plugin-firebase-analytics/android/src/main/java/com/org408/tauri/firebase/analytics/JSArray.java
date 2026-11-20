package com.org408.tauri.firebase.analytics;

import org.json.JSONArray;

/** Capacitor's JSArray */
class JSArray extends JSONArray {

    JSArray(JSONArray array) {
        super();
        for (int i = 0; i < array.length(); i++) {
            put(array.opt(i));
        }
    }
}
