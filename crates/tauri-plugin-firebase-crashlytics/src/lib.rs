//! Firebase Crashlytics for Tauri 2 on iOS and Android.
//!
//! A port of `@capacitor-firebase/crashlytics` (in
//! [capacitor-firebase](https://github.com/capawesome-team/capacitor-firebase)) 8.6.0: every method of its
//! `FirebaseCrashlyticsPlugin`, with the same names, arguments and results. The work is Firebase's native SDKs', called from the
//! Swift and Kotlin plugins in `ios/` and `android/` the way the Capacitor plugin calls them. Rust only passes each
//! call through.
//!
//! ```rust,ignore
//! tauri::Builder::default().plugin(tauri_plugin_firebase_crashlytics::init())
//! ```
//!
//! Allow the commands with `"firebase-crashlytics:default"`, then use the TypeScript API
//! (`import { FirebaseCrashlytics } from 'tauri-plugin-firebase-crashlytics-api'`).
//!
//! An independent community project, not an official Tauri or Firebase plugin.

use tauri::{
  plugin::{Builder, TauriPlugin},
  Manager, Runtime,
};

#[cfg(desktop)]
mod desktop;
#[cfg(mobile)]
mod mobile;

mod commands;
mod error;

pub use error::{Error, Result};

#[cfg(desktop)]
pub use desktop::FirebaseCrashlytics;
#[cfg(mobile)]
pub use mobile::FirebaseCrashlytics;

/// The plugin's name: the Tauri plugin and its permissions (`firebase-crashlytics:default`)
pub const PLUGIN_NAME: &str = "firebase-crashlytics";

/// The commands as (Tauri command, Swift / Kotlin method), in the order of @capacitor-firebase/crashlytics's definitions.ts
pub const COMMANDS: &[(&str, &str)] = commands::COMMANDS;

/// Where the plugin runs: the TypeScript side calls the native plugin on `ios` and `android`, and otherwise uses
/// the same stand-in as @capacitor-firebase/crashlytics on the web (`web.ts`)
pub fn platform() -> &'static str {
  if cfg!(target_os = "ios") {
    "ios"
  } else if cfg!(target_os = "android") {
    "android"
  } else {
    "desktop"
  }
}

/// Access to the plugin from Rust (`app.firebase_crashlytics()`)
pub trait FirebaseCrashlyticsExt<R: Runtime> {
  fn firebase_crashlytics(&self) -> &FirebaseCrashlytics<R>;
}

impl<R: Runtime, T: Manager<R>> FirebaseCrashlyticsExt<R> for T {
  fn firebase_crashlytics(&self) -> &FirebaseCrashlytics<R> {
    self.state::<FirebaseCrashlytics<R>>().inner()
  }
}

/// Initializes the plugin
pub fn init<R: Runtime>() -> TauriPlugin<R> {
  Builder::new(PLUGIN_NAME)
    .js_init_script(format!(
      "Object.defineProperty(window, '__TAURI_FIREBASE_CRASHLYTICS__', {{ value: Object.freeze({{ platform: '{}' }}) }});",
      platform()
    ))
    .invoke_handler(commands::handler())
    .setup(|app, api| {
      #[cfg(mobile)]
      let plugin = mobile::init(app, api)?;
      #[cfg(desktop)]
      let plugin = desktop::init(app, api)?;
      app.manage(plugin);
      Ok(())
    })
    .build()
}

#[cfg(test)]
mod tests {
  use super::*;

  /// snake_case as heck (and so Tauri) does it: getAppInstanceId → get_app_instance_id
  fn snake(name: &str) -> String {
    let chars: Vec<char> = name.chars().collect();
    let mut out = String::new();
    for (i, c) in chars.iter().enumerate() {
      if i > 0 && c.is_ascii_uppercase() {
        let prev = chars[i - 1];
        let next_lower = chars.get(i + 1).is_some_and(|n| n.is_ascii_lowercase());
        if prev.is_ascii_lowercase() || (prev.is_ascii_uppercase() && next_lower) {
          out.push('_');
        }
      }
      out.push(c.to_ascii_lowercase());
    }
    out
  }

  #[test]
  fn commands_are_snake_case_of_their_methods() {
    for (command, method) in COMMANDS {
      assert_eq!(*command, snake(method), "{method}");
    }
  }

  #[test]
  fn every_command_once() {
    let mut names: Vec<_> = COMMANDS.iter().map(|(c, _)| *c).collect();
    names.sort();
    names.dedup();
    assert_eq!(names.len(), COMMANDS.len());
    assert_eq!(COMMANDS.len(), 10);
  }

  #[test]
  fn the_platform_is_desktop_off_mobile() {
    assert_eq!(platform(), "desktop");
  }
}
