use tauri::Manager;

/// The page's results, written where the checks read them (the app's data folder, report.json)
#[tauri::command]
fn save_report(app: tauri::AppHandle, report: String) -> Result<(), String> {
  let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
  std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
  #[cfg(target_os = "android")]
  android_log(&report);
  std::fs::write(dir.join("report.json"), report).map_err(|e| e.to_string())
}

/// The report in logcat too (a release build's data folder is closed to adb): `adb logcat -s firebase-tester`
#[cfg(target_os = "android")]
fn android_log(report: &str) {
  use std::ffi::CString;
  #[link(name = "log")]
  extern "C" {
    fn __android_log_write(
      prio: i32,
      tag: *const std::ffi::c_char,
      text: *const std::ffi::c_char,
    ) -> i32;
  }
  let tag = CString::new("firebase-tester").unwrap();
  let compact: String = report.lines().map(str::trim).collect();
  let chars: Vec<char> = compact.chars().collect();
  for (i, chunk) in chars.chunks(3000).enumerate() {
    let text =
      CString::new(format!("{i:03} {}", chunk.iter().collect::<String>())).unwrap_or_default();
    unsafe { __android_log_write(4, tag.as_ptr(), text.as_ptr()) };
  }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_firebase_analytics::init())
    .plugin(tauri_plugin_firebase_crashlytics::init())
    .plugin(tauri_plugin_firebase_messaging::init())
    .invoke_handler(tauri::generate_handler![save_report])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
