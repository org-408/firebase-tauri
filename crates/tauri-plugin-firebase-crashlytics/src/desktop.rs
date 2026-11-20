use serde::de::DeserializeOwned;
use serde_json::Value;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<FirebaseCrashlytics<R>> {
  Ok(FirebaseCrashlytics(app.clone()))
}

/// Firebase Crashlytics is the iOS and Android SDKs'. On desktop the TypeScript side never calls these commands:
/// like @capacitor-firebase/crashlytics on the web, it uses its stand-in (`web.ts`)
pub struct FirebaseCrashlytics<R: Runtime>(#[allow(dead_code)] AppHandle<R>);

impl<R: Runtime> FirebaseCrashlytics<R> {
  pub async fn call(&self, method: &str, _args: Value) -> crate::Result<Value> {
    Err(crate::Error::Unimplemented(format!(
      "\"FirebaseCrashlytics.{method}()\" is not implemented on desktop"
    )))
  }
}
