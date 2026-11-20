// Firebase Analytics' iOS SDK is distributed as binary xcframeworks (static archives). swift-rs, which builds the Swift
// package for a Tauri plugin, downloads them but does not link them, so the app would not link. This takes the slice
// for the target out of each xcframework the plugin needs, and links it into the plugin's Rust library (bundled into the
// static library the app's Xcode project links; whole-archive because the SDK relies on Objective-C categories, which
// the `-ObjC` flag would otherwise be needed for). docs/TECH-NOTES.md §9.
//
// The list is what the `FirebaseAnalytics` product needs: keep it in step with the SDK (a missing one is a link error).
use std::path::{Path, PathBuf};
use std::process::Command;

const XCFRAMEWORKS: &[&str] = &[
  "FirebaseAnalytics",
  "GoogleAppMeasurement",
  "GoogleAppMeasurementIdentitySupport",
  "GoogleAdsOnDeviceConversion",
];

/// System libraries and frameworks the Google App Measurement SDK links against
const SYSTEM_LIBS: &[&str] = &["sqlite3", "z", "c++"];
const SYSTEM_FRAMEWORKS: &[&str] = &["StoreKit", "AdSupport", "SystemConfiguration", "Security", "UIKit", "Network"];

fn find_xcframework(dir: &Path, name: &str) -> Option<PathBuf> {
  for entry in std::fs::read_dir(dir).ok()?.flatten() {
    let path = entry.path();
    if path.is_dir() {
      if path.file_name()?.to_str()? == format!("{name}.xcframework") {
        return Some(path);
      }
      if let Some(found) = find_xcframework(&path, name) {
        return Some(found);
      }
    }
  }
  None
}

fn link_ios_binaries() {
  let target = std::env::var("TARGET").unwrap_or_default();
  if !target.ends_with("apple-ios") && !target.ends_with("apple-ios-sim") && target != "x86_64-apple-ios" {
    return;
  }
  let simulator = target.ends_with("-sim") || target == "x86_64-apple-ios";
  let arch = if target.starts_with("x86_64") { "x86_64" } else { "arm64" };
  let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
  let artifacts = out.join("swift-rs/tauri-plugin-firebase-analytics/artifacts");
  let libs = out.join("firebase-binaries");
  std::fs::create_dir_all(&libs).unwrap();
  for name in XCFRAMEWORKS {
    let xcframework = find_xcframework(&artifacts, name)
      .unwrap_or_else(|| panic!("{name}.xcframework not found in {}", artifacts.display()));
    let slice = std::fs::read_dir(&xcframework)
      .unwrap()
      .flatten()
      .map(|e| e.path())
      .find(|p| {
        let n = p.file_name().and_then(|n| n.to_str()).unwrap_or_default();
        n.starts_with("ios-") && !n.contains("maccatalyst") && n.contains("simulator") == simulator
      })
      .unwrap_or_else(|| panic!("no iOS slice for {target} in {}", xcframework.display()));
    let binary = slice.join(format!("{name}.framework/{name}"));
    let dest = libs.join(format!("lib{name}.a"));
    let thin = Command::new("lipo")
      .args(["-thin", arch, "-output"])
      .arg(&dest)
      .arg(&binary)
      .status()
      .map(|s| s.success())
      .unwrap_or(false);
    if !thin {
      // already a single-architecture archive
      std::fs::copy(&binary, &dest).unwrap();
    }
    println!("cargo:rustc-link-lib=static:+bundle,+whole-archive={name}");
  }
  println!("cargo:rustc-link-search=native={}", libs.display());
  for lib in SYSTEM_LIBS {
    println!("cargo:rustc-link-lib={lib}");
  }
  for framework in SYSTEM_FRAMEWORKS {
    println!("cargo:rustc-link-lib=framework={framework}");
  }
}
