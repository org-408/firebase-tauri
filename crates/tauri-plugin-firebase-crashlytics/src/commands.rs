//! The commands. Each passes its arguments, as the page sent them, to the method of the same name in the
//! Swift / Kotlin plugin, and hands back what the plugin returns. The work is the Firebase SDK's.

use serde_json::Value;
use tauri::{
  ipc::{InvokeBody, Request},
  AppHandle, Runtime,
};

use crate::{FirebaseCrashlyticsExt, Result};

/// The arguments as the page sent them (the object @capacitor-firebase/crashlytics's plugin receives)
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
        app.firebase_crashlytics().call($method, args(&request)).await
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

// @capacitor-firebase/crashlytics's native plugin methods, in the order of its definitions.ts
commands! {
  crash => "crash",
  set_custom_key => "setCustomKey",
  set_user_id => "setUserId",
  log => "log",
  set_enabled => "setEnabled",
  is_enabled => "isEnabled",
  did_crash_on_previous_execution => "didCrashOnPreviousExecution",
  send_unsent_reports => "sendUnsentReports",
  delete_unsent_reports => "deleteUnsentReports",
  record_exception => "recordException",
}
