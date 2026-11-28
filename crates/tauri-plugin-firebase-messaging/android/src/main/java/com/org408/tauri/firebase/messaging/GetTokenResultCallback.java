// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
package com.org408.tauri.firebase.messaging;

public interface GetTokenResultCallback {
    void success(String token);
    void error(String message);
}
