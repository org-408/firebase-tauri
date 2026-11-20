use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_firebase_crashlytics);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<FirebaseCrashlytics<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin(
    "com.org408.tauri.firebase.crashlytics",
    "FirebaseCrashlyticsPlugin",
  )?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_firebase_crashlytics)?;
  Ok(FirebaseCrashlytics(handle))
}

/// Passes each call to the Swift / Kotlin plugin as it came from the page (the shapes are @capacitor-firebase/crashlytics's, not Rust's)
pub struct FirebaseCrashlytics<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> FirebaseCrashlytics<R> {
  pub async fn call(&self, method: &str, args: Value) -> crate::Result<Value> {
    Ok(self.0.run_mobile_plugin_async(method, args).await?)
  }
}
