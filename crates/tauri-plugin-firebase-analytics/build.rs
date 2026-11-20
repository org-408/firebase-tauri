// The commands: the methods @capacitor-firebase/analytics's native plugin registers, in the order of its definitions.ts.
// Keep in step with src/commands.rs, guest-js/commands.ts and permissions/default.toml (__tests__/apiParity.test.ts checks).
const COMMANDS: &[&str] = &[
  "get_app_instance_id",
  "set_consent",
  "set_user_id",
  "set_user_property",
  "set_current_screen",
  "log_event",
  "set_session_timeout_duration",
  "set_enabled",
  "is_enabled",
  "reset_analytics_data",
  "log_transaction",
  "initiate_on_device_conversion_measurement_with_email_address",
  "initiate_on_device_conversion_measurement_with_phone_number",
  "initiate_on_device_conversion_measurement_with_hashed_email_address",
  "initiate_on_device_conversion_measurement_with_hashed_phone_number",
];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .ios_path("ios")
    .build();
}
