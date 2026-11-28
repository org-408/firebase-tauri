// The commands: the methods @capacitor-firebase/messaging's native plugin registers, in the order of its definitions.ts,
// then the two commands Tauri's `addPluginListener` calls to deliver events (the plugin's `addListener`).
// Keep in step with src/commands.rs, guest-js/commands.ts and permissions/default.toml (__tests__/apiParity.test.ts checks).
const COMMANDS: &[&str] = &[
  "check_permissions",
  "request_permissions",
  "is_supported",
  "get_token",
  "delete_token",
  "get_delivered_notifications",
  "remove_delivered_notifications",
  "remove_all_delivered_notifications",
  "subscribe_to_topic",
  "unsubscribe_from_topic",
  "create_channel",
  "delete_channel",
  "list_channels",
  "register_listener",
  "remove_listener",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
