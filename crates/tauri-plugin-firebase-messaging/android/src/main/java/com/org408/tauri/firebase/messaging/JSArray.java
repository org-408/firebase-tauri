package com.org408.tauri.firebase.messaging;

import java.util.ArrayList;
import java.util.List;
import org.json.JSONArray;

/** Capacitor's JSArray */
class JSArray extends JSONArray {

    JSArray() {
        super();
    }

    JSArray(JSONArray array) {
        super();
        for (int i = 0; i < array.length(); i++) {
            put(array.opt(i));
        }
    }

    /** Capacitor's: the elements as a list */
    public <E> List<E> toList() throws org.json.JSONException {
        List<E> items = new ArrayList<>();
        for (int i = 0; i < length(); i++) {
            @SuppressWarnings("unchecked")
            E item = (E) get(i);
            items.add(item);
        }
        return items;
    }
}
