use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

#[cfg(target_os = "ios")]
tauri::ios_plugin_binding!(init_plugin_firebase_messaging);

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<FirebaseMessaging<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin(
    "com.org408.tauri.firebase.messaging",
    "FirebaseMessagingPlugin",
  )?;
  #[cfg(target_os = "ios")]
  let handle = api.register_ios_plugin(init_plugin_firebase_messaging)?;
  Ok(FirebaseMessaging(handle))
}

/// Passes each call to the Swift / Kotlin plugin as it came from the page (the shapes are @capacitor-firebase/messaging's, not Rust's)
pub struct FirebaseMessaging<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> FirebaseMessaging<R> {
  pub async fn call(&self, method: &str, args: Value) -> crate::Result<Value> {
    Ok(self.0.run_mobile_plugin_async(method, args).await?)
  }

  /// Hands the page's channel for `event` to the Swift / Kotlin plugin, which sends the event to it
  pub async fn register_listener(
    &self,
    event: String,
    handler: tauri::ipc::Channel<Value>,
  ) -> crate::Result<()> {
    #[derive(serde::Serialize)]
    struct RegisterListener {
      event: String,
      handler: tauri::ipc::Channel<Value>,
    }
    Ok(
      self
        .0
        .run_mobile_plugin_async("registerEventListener", RegisterListener { event, handler })
        .await?,
    )
  }

  pub async fn remove_listener(&self, event: String, channel_id: u32) -> crate::Result<()> {
    #[derive(serde::Serialize)]
    #[serde(rename_all = "camelCase")]
    struct RemoveListener {
      event: String,
      channel_id: u32,
    }
    Ok(
      self
        .0
        .run_mobile_plugin_async("removeEventListener", RemoveListener { event, channel_id })
        .await?,
    )
  }
}
