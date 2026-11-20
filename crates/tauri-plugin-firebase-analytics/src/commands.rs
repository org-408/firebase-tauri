//! The commands. Each passes its arguments, as the page sent them, to the method of the same name in the
//! Swift / Kotlin plugin, and hands back what the plugin returns. The work is the Firebase SDK's.

use serde_json::Value;
use tauri::{
  ipc::{InvokeBody, Request},
  AppHandle, Runtime,
};

use crate::{FirebaseAnalyticsExt, Result};

/// The arguments as the page sent them (the object @capacitor-firebase/analytics's plugin receives)
fn args(request: &Request<'_>) -> Value {
  match request.body() {
    InvokeBody::Json(value) => value.clone(),
    InvokeBody::Raw(_) => Value::Object(Default::default()),
  }
}

macro_rules! commands {
  ($($name:ident => $method:literal),* $(,)?) => {
    $(
      #[tauri::command]
      pub(crate) async fn $name<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<Value> {
        app.firebase_analytics().call($method, args(&request)).await
      }
    )*

    pub(crate) fn handler<R: Runtime>() -> impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static {
      tauri::generate_handler![$($name),*]
    }

    /// (command, method) — the Tauri command and the Swift / Kotlin method it calls
    #[allow(dead_code)]
    pub const COMMANDS: &[(&str, &str)] = &[$((stringify!($name), $method)),*];
  };
}

// @capacitor-firebase/analytics's native plugin methods, in the order of its definitions.ts
commands! {
  get_app_instance_id => "getAppInstanceId",
  set_consent => "setConsent",
  set_user_id => "setUserId",
  set_user_property => "setUserProperty",
  set_current_screen => "setCurrentScreen",
  log_event => "logEvent",
  set_session_timeout_duration => "setSessionTimeoutDuration",
  set_enabled => "setEnabled",
  is_enabled => "isEnabled",
  reset_analytics_data => "resetAnalyticsData",
  log_transaction => "logTransaction",
  initiate_on_device_conversion_measurement_with_email_address => "initiateOnDeviceConversionMeasurementWithEmailAddress",
  initiate_on_device_conversion_measurement_with_phone_number => "initiateOnDeviceConversionMeasurementWithPhoneNumber",
  initiate_on_device_conversion_measurement_with_hashed_email_address => "initiateOnDeviceConversionMeasurementWithHashedEmailAddress",
  initiate_on_device_conversion_measurement_with_hashed_phone_number => "initiateOnDeviceConversionMeasurementWithHashedPhoneNumber",
}
