use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<FirebaseMessaging<R>> {
  Ok(FirebaseMessaging(app.clone()))
}

/// Firebase Messaging is the iOS and Android SDKs'. On desktop the TypeScript side never calls these commands:
/// like @capacitor-firebase/messaging on the web, it uses its stand-in (`web.ts`)
pub struct FirebaseMessaging<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> FirebaseMessaging<R> {
  pub async fn call(&self, method: &str, _args: Value) -> crate::Result<Value> {
    Err(crate::Error::Unimplemented(format!(
      "\"FirebaseMessaging.{method}()\" is not implemented on desktop"
    )))
  }

  pub async fn register_listener(
    &self,
    _event: String,
    _handler: tauri::ipc::Channel<Value>,
  ) -> crate::Result<()> {
    Err(crate::Error::Unimplemented(
      "\"FirebaseMessaging.addListener()\" is not implemented on desktop".to_string(),
    ))
  }

  pub async fn remove_listener(&self, _event: String, _channel_id: u32) -> crate::Result<()> {
    Err(crate::Error::Unimplemented(
      "\"FirebaseMessaging.removeListener()\" is not implemented on desktop".to_string(),
    ))
  }
}
