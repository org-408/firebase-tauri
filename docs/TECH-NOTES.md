# Technical notes

What was decided in the port, where it differs from the Capacitor plugins, and what is not verified. The method is the same
as in [`purchases-tauri`](https://github.com/org-408/purchases-tauri): keep the upstream API and native code, and replace
only the bridge.

## 1. What was ported from where

Upstream: `capawesome-team/capacitor-firebase` tag `@capacitor-firebase/analytics@8.6.0` and
`@capacitor-firebase/crashlytics@8.6.0` (commit `b6b63f20`), Apache-2.0.

| This repository (`crates/tauri-plugin-firebase-<name>/`) | Upstream (`packages/<name>/`)        | How                                                                                                      |
| -------------------------------------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| `guest-js/definitions.ts`                                | `src/definitions.ts`                 | **Unchanged** apart from a notice line and formatting (`apiParity` compares the method list with the published package)                          |
| `guest-js/web.ts`                                        | `src/web.ts`                         | Only the imports change (`WebPlugin` is `web-plugin.ts`, a copy of the part of Capacitor's it uses)      |
| `guest-js/index.ts`                                      | `src/index.ts`                       | `registerPlugin` becomes the Tauri commands (`invoke`); the web stand-in is loaded lazily as upstream    |
| `ios/Sources/*/Firebase<Name>*.swift`                    | `ios/Plugin/*.swift`                 | `CAPPluginCall` becomes `PluginCall` (a wrapper of Tauri's `Invoke`); `CAPPlugin` becomes `Plugin`       |
| `android/src/main/java/**`                               | `android/src/main/java/**`           | Same: `PluginCall`, `JSObject`, `JSArray` are small classes of the same behaviour on Tauri's `Invoke`    |
| `ios/Package.swift`, `android/build.gradle.kts`          | `Package.swift`, `android/build.gradle` | Tauri's package layout; the Firebase SDK versions are upstream's (`apiParity` and `follow-upstream` keep them) |
| `src/*.rs`, `build.rs`, `permissions/`                   | (Capacitor's bridge)                 | One Tauri command per method; its body only passes the call to the Swift / Java method of the same name  |

Files derived from upstream carry the upstream's copyright; see [NOTICE](../NOTICE). The installed Capacitor
packages in `node_modules` are the reference for the tests, so the repository does not vendor upstream sources.

## 2. Errors

Capacitor rejects with an `Error` that has the plugin's message and, for "not implemented" and "not available", `code`
`UNIMPLEMENTED` / `UNAVAILABLE`. Swift and Java reject through Tauri's own `reject(message, code)`; the Rust side passes
`{ code, message }` to the page, and `bridge.ts` turns it into `TauriFirebaseException`, an `Error` with `code`. These two
plugins never send `data`, so the marked-result detour that `purchases-tauri` needed (Tauri's Rust side keeps only `code` and
`message` of a rejection) is not needed here.

## 3. No callbacks

Neither package has listeners or callbacks, so none of Tauri's Channel machinery is used.

## 4. Where it runs

Rust injects `window.__TAURI_FIREBASE_ANALYTICS__ = { platform }` (and `..._CRASHLYTICS__`). On `ios` and `android` the
TypeScript calls the native plugin; elsewhere (Tauri desktop, a plain browser, an app that did not register the plugin) the
Capacitor packages' web stand-in answers, as Capacitor's `registerPlugin(..., { web })` does. For Analytics that is the
Firebase JS SDK (`firebase` is an optional peer dependency; the app must call `initializeApp`); for Crashlytics every method
rejects with `UNIMPLEMENTED`.

## 5. Return values

Tauri returns "nothing" as `null`; methods that resolve `void` upstream resolve `undefined` here. No method resolves `null`.

## 6. Crashlytics: automatic crash collection in a Tauri app (not verified on a device)

From the Firebase SDKs' behaviour; **not yet verified in a running app** (see ROADMAP):

- Swift / Objective-C / Java / Kotlin crashes: collected once Firebase is initialised, as in any native app.
- **Rust panics and other native (C/C++) crashes on Android:** Crashlytics reports native crashes only with the NDK add-on
  (`com.google.firebase:firebase-crashlytics-ndk`, and `nativeSymbolUploadEnabled` in the `firebaseCrashlytics` Gradle
  block for symbols). The Capacitor plugin does not include it, and neither does this port. An app that wants Rust panics
  reported on Android should add it to its own Gradle dependencies.
- **Rust panics on iOS:** a panic that aborts the process raises `SIGABRT`, which the Crashlytics signal handler catches.
- WebView renderer crashes do not terminate the app, so they are not crashes for Crashlytics. JavaScript errors are never
  collected automatically (in Capacitor either): call `recordException()`.

## 7. Advertising ID

- Android: `firebase-analytics` brings the `AD_ID` permission through manifest merging, as with the Capacitor plugin.
  Nothing here removes it.
- iOS: upstream 8.6.0's `Package.swift` uses SwiftPM *traits* (`Analytics` default: includes IDFA support;
  `AnalyticsWithoutAdIdSupport`). Traits need `swift-tools-version: 6.1`, which Tauri's iOS build does not use yet, so this
  port links `FirebaseAnalytics` (the default trait's product). The IDFA is read only when the app has ATT consent. The
  `AnalyticsWithoutAdIdSupport` choice is on the ROADMAP.
- Coexistence with an AdMob plugin (for example `admob-tauri`): this repository adds only the Firebase SDK and does not touch
  the advertising ID or the manifest beyond what `firebase-analytics` merges. **Not verified** together with an AdMob plugin
  in one app; the app that uses both should check the build (duplicate symbols on iOS, merged manifest on Android).

## 8. Two plugins, one Firebase SDK

On iOS each Tauri plugin is a static library that includes its Swift package dependencies, so both plugins contain
`FirebaseCore`. The linker takes duplicate symbols from the first library, so the two plugins must pin the same Firebase iOS
SDK version. `apiParity` checks the two `Package.swift` files against upstream, which pins one version for both.

## 9. iOS: Firebase Analytics' binary frameworks

`FirebaseAnalytics`, `GoogleAppMeasurement`, `GoogleAppMeasurementIdentitySupport` and `GoogleAdsOnDeviceConversion` are binary
xcframeworks in the Firebase iOS SDK. swift-rs (which builds a Tauri plugin's Swift package) downloads them but links nothing from
them, so an app using the plugin failed to link (`Undefined symbols … FIRConsentStatus`, found 2026-11-21 building
`examples/firebase-tester`). `crates/tauri-plugin-firebase-analytics/ios_binaries.rs` (included by `build.rs`) takes the slice for
the target out of each xcframework (`lipo -thin`), and links it with `+bundle,+whole-archive`, so it is inside the static
library the app's Xcode project links (whole-archive for the Objective-C categories). The system libraries are linked too
(`sqlite3`, `z`, `c++`, StoreKit, AdSupport, …). The list of xcframeworks is what the `FirebaseAnalytics` product needs today; a new
one in a Firebase release shows up as a link error in the example app (the iOS CI job links it). `FirebaseCrashlytics` has no binary target.

### Xcode version

Verified with **Xcode 27.0**. With Xcode 26.6 (the newest on GitHub's macOS runners, 2026-11-20) the Analytics plugin does not build:
swift-rs calls `swift build --sdk <iOS SDK>`, and Xcode 26's SwiftPM then resolves the Firebase binary frameworks for macOS
(`'Cocoa/Cocoa.h' file not found` in `FirebaseAnalytics-umbrella.h`). Crashlytics has no binary targets and is checked in CI. Supporting
Xcode 26 for Analytics is on the ROADMAP.

### Objective-C categories the app's linker drops

Whole-archive only puts every object into the plugin's static library; the app's Xcode project (which Tauri generates without `-ObjC`)
still pulls an archive member only when something refers to it. GoogleUtilities' `NSData(GULGzip)` is a category with no
referenced symbol, so it was dropped and Analytics crashed on the first event upload: `+[NSData gul_dataByGzippingData:error:]:
unrecognized selector` (found 2026-11-21 with the first run against a Firebase test project; with no Firebase config it never
showed). `src/lib.rs` refers to `GULNSDataZlibErrorDomain`, a symbol of the same object, which keeps it. After the fix all 18
Firebase checks of `examples/firebase-tester` pass on the iOS Simulator (Xcode 27.0).

### Verification status (2026-11-21)

All 18 Firebase checks of `examples/firebase-tester` pass against a Firebase test project on the iOS Simulator (Xcode 27.0, iOS 27)
and on an Android emulator (API 36, arm64), next to the 25 plugin checks (no Firebase project needed). **Not verified:** that a
native crash reaches the Crashlytics console, and a physical device. `crash()` on Android had no effect at first (Tauri catches what a
command throws); it now throws from the main thread's message loop and the app dies with `FATAL EXCEPTION: main` (2026-11-21).
