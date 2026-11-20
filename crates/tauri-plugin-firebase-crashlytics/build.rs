// The commands: the methods @capacitor-firebase/crashlytics's native plugin registers, in the order of its definitions.ts.
// Keep in step with src/commands.rs, guest-js/commands.ts and permissions/default.toml (__tests__/apiParity.test.ts checks).
const COMMANDS: &[&str] = &[
  "crash",
  "set_custom_key",
  "set_user_id",
  "log",
  "set_enabled",
  "is_enabled",
  "did_crash_on_previous_execution",
  "send_unsent_reports",
  "delete_unsent_reports",
  "record_exception",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
