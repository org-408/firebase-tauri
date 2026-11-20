use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_firebase_analytics);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<FirebaseAnalytics<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin(
    "com.org408.tauri.firebase.analytics",
    "FirebaseAnalyticsPlugin",
  )?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_firebase_analytics)?;
  Ok(FirebaseAnalytics(handle))
}

/// Passes each call to the Swift / Kotlin plugin as it came from the page (the shapes are @capacitor-firebase/analytics's, not Rust's)
pub struct FirebaseAnalytics<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> FirebaseAnalytics<R> {
  pub async fn call(&self, method: &str, args: Value) -> crate::Result<Value> {
    Ok(self.0.run_mobile_plugin_async(method, args).await?)
  }
}
