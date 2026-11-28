//! The commands. Each passes its arguments, as the page sent them, to the method of the same name in the
//! Swift / Kotlin plugin, and hands back what the plugin returns. The work is the Firebase SDK's.

use serde_json::Value;
use tauri::{
  ipc::{Channel, InvokeBody, Request},
  AppHandle, Runtime,
};

use crate::{FirebaseMessagingExt, Result};

/// The arguments as the page sent them (the object @capacitor-firebase/messaging's plugin receives)
fn args(request: &Request<'_>) -> Value {
  match request.body() {
    InvokeBody::Json(value) => value.clone(),
    InvokeBody::Raw(_) => Value::Object(Default::default()),
  }
}

/// What `addPluginListener` (Tauri's counterpart of Capacitor's `addListener`) calls: the page's channel for one of the
/// plugin's events (`tokenReceived`, `notificationReceived`, `notificationActionPerformed`, `apnsTokenReceived`).
/// The Swift / Kotlin plugin keeps the channels and sends each event to them (`trigger`).
#[tauri::command]
pub(crate) async fn register_listener<R: Runtime>(
  app: AppHandle<R>,
  event: String,
  handler: Channel<Value>,
) -> Result<()> {
  app
    .firebase_messaging()
    .register_listener(event, handler)
    .await
}

/// What the handle `addPluginListener` returned calls on `unregister()`
#[tauri::command]
pub(crate) async fn remove_listener<R: Runtime>(
  app: AppHandle<R>,
  event: String,
  channel_id: u32,
) -> Result<()> {
  app
    .firebase_messaging()
    .remove_listener(event, channel_id)
    .await
}

macro_rules! commands {
  ($($name:ident => $method:literal),* $(,)?) => {
    $(
      #[tauri::command]
      pub(crate) async fn $name<R: Runtime>(app: AppHandle<R>, request: Request<'_>) -> Result<Value> {
        app.firebase_messaging().call($method, args(&request)).await
      }
    )*

    pub(crate) fn handler<R: Runtime>() -> impl Fn(tauri::ipc::Invoke<R>) -> bool + Send + Sync + 'static {
      tauri::generate_handler![$($name,)* register_listener, remove_listener]
    }

    /// (command, method) — the Tauri command and the Swift / Kotlin method it calls
    #[allow(dead_code)]
    pub const COMMANDS: &[(&str, &str)] = &[$((stringify!($name), $method)),*];
  };
}

// @capacitor-firebase/messaging's native plugin methods, in the order of its definitions.ts
commands! {
  check_permissions => "checkPermissions",
  request_permissions => "requestPermissions",
  is_supported => "isSupported",
  get_token => "getToken",
  delete_token => "deleteToken",
  get_delivered_notifications => "getDeliveredNotifications",
  remove_delivered_notifications => "removeDeliveredNotifications",
  remove_all_delivered_notifications => "removeAllDeliveredNotifications",
  subscribe_to_topic => "subscribeToTopic",
  unsubscribe_from_topic => "unsubscribeFromTopic",
  create_channel => "createChannel",
  delete_channel => "deleteChannel",
  list_channels => "listChannels",
}
