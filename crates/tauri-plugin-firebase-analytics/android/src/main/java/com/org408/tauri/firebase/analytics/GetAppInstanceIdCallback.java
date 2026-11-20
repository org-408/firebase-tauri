// Derived from @capacitor-firebase/analytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
package com.org408.tauri.firebase.analytics;

import androidx.annotation.Nullable;

public interface GetAppInstanceIdCallback {
    void success(@Nullable String appInstanceId);
    void error(String message);
}
