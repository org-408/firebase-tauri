# firebase-tauri

[Tauri 2](https://tauri.app) plugins for [Firebase](https://firebase.google.com) **Analytics**, **Crashlytics** and **Cloud Messaging** (push) on iOS
and Android: ports of [`@capacitor-firebase/analytics`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/analytics),
[`@capacitor-firebase/crashlytics`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/crashlytics)
and [`@capacitor-firebase/messaging`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/messaging)
that keep their API: the same method names, arguments, results and errors. An app moving from Capacitor to Tauri Mobile
only changes an import.

Status: **v0.1.1, not published to crates.io / npm yet.** Use it from git for now (see [Install](#install)).

**Plan:** the intent is to publish the crates and npm packages. Before that, the plugins are to be adopted in a real app
(ai-tarot-chat or Fabloom) and shown to work there, and tried on a physical device. See [Known limits](#known-limits) and
[docs/ROADMAP.md](docs/ROADMAP.md).

| Plugin                                                            | Rust crate                           | npm package                              | Port of                              |
| ----------------------------------------------------------------- | ------------------------------------ | ---------------------------------------- | ------------------------------------ |
| [Analytics](crates/tauri-plugin-firebase-analytics/README.md)     | `tauri-plugin-firebase-analytics`    | `tauri-plugin-firebase-analytics-api`    | `@capacitor-firebase/analytics` 8.6.0   |
| [Crashlytics](crates/tauri-plugin-firebase-crashlytics/README.md) | `tauri-plugin-firebase-crashlytics`  | `tauri-plugin-firebase-crashlytics-api`  | `@capacitor-firebase/crashlytics` 8.6.0 |
| [Messaging](crates/tauri-plugin-firebase-messaging/README.md)     | `tauri-plugin-firebase-messaging`    | `tauri-plugin-firebase-messaging-api`    | `@capacitor-firebase/messaging` 8.6.0   |

This is an independent community project. It is not affiliated with or endorsed by Google, the Tauri Programme or
Capawesome, and it is not an official Tauri plugin.

## How it works

The native code is the Capacitor plugins' own, called the same way: the Swift and Java of `@capacitor-firebase/*` run on
Tauri's plugin classes, with a small shim (`PluginCall`) standing in for Capacitor's `CAPPluginCall`. The TypeScript API
(`definitions.ts`) is copied unchanged. Rust only passes each call through. That is why the API stays identical, and why a
new upstream release can be followed mechanically (see [Following upstream](#following-upstream)).

| Platform        | What `FirebaseAnalytics` / `FirebaseCrashlytics` / `FirebaseMessaging` do                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------- |
| iOS, Android    | Call the Firebase native SDKs, as the Capacitor plugins do                                                  |
| Desktop, web    | The Capacitor packages' web behaviour: Analytics uses the Firebase JS SDK (`firebase`, optional peer dependency); Crashlytics rejects with `UNIMPLEMENTED`; Messaging uses the Firebase JS SDK's `firebase/messaging` (a service worker, as upstream) |

## Install

Not on crates.io or npm yet; use the git tag. In `src-tauri/Cargo.toml`:

```toml
[dependencies]
tauri-plugin-firebase-analytics = { git = "https://github.com/org-408/firebase-tauri", tag = "v0.1.1" }
tauri-plugin-firebase-crashlytics = { git = "https://github.com/org-408/firebase-tauri", tag = "v0.1.1" }
tauri-plugin-firebase-messaging = { git = "https://github.com/org-408/firebase-tauri", tag = "v0.1.1" }
```

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_firebase_analytics::init())
    .plugin(tauri_plugin_firebase_crashlytics::init())
    .plugin(tauri_plugin_firebase_messaging::init())
```

In `src-tauri/capabilities/default.json`:

```json
{ "permissions": ["firebase-analytics:default", "firebase-crashlytics:default", "firebase-messaging:default"] }
```

The TypeScript API is built into `dist-js/` and committed, so it installs from git as well (a workspace subfolder:
copy it, or use a package manager that installs from a git subdirectory). After publishing:
`npm i tauri-plugin-firebase-analytics-api tauri-plugin-firebase-crashlytics-api tauri-plugin-firebase-messaging-api`.

```ts
// before (Capacitor)
import { FirebaseAnalytics } from '@capacitor-firebase/analytics';
// after (Tauri)
import { FirebaseAnalytics } from 'tauri-plugin-firebase-analytics-api';
```

**iOS needs Xcode 27 for Analytics** (see [docs/TECH-NOTES.md §9](docs/TECH-NOTES.md)); Crashlytics builds with Xcode 26 as well.

## Firebase setup

The plugins configure Firebase themselves (`FirebaseApp.configure()` on iOS; the Google Services plugin on Android),
like the Capacitor plugins, so the app needs the two config files of your Firebase project.

### Android

1. Put `google-services.json` in `src-tauri/gen/android/app/`.
2. Apply the Google Services Gradle plugin. In `src-tauri/gen/android/build.gradle.kts` add to `buildscript.dependencies`:
   `classpath("com.google.gms:google-services:4.4.4")` (or newer), and in `src-tauri/gen/android/app/build.gradle.kts` add
   `id("com.google.gms.google-services")` to `plugins`.
3. **Crashlytics only:** also add `classpath("com.google.firebase:firebase-crashlytics-gradle:3.0.6")` (or newer) and
   `id("com.google.firebase.crashlytics")`. The plugin uploads the mapping file for symbolicated stack traces; without
   it a release build with R8 reports obfuscated frames.

`src-tauri/gen/` is generated by `tauri android init`: commit your changes, and re-apply them if you regenerate it.

### iOS

1. Download `GoogleService-Info.plist` from the Firebase console and add it to the app's Xcode target
   (`src-tauri/gen/apple/`) so it is copied into the app bundle. If it is missing, the plugins log
   `Firebase was not configured: GoogleService-Info.plist is missing from the app bundle.` and do nothing.
2. **Crashlytics only:** add a Run Script build phase that uploads dSYMs, after the compile and embed phases:
   `"${BUILD_DIR%/Build/*}/SourcePackages/checkouts/firebase-ios-sdk/Crashlytics/run"`, with the input files
   `${DWARF_DSYM_FOLDER_PATH}/${DWARF_DSYM_FILE_NAME}/Contents/Resources/DWARF/${TARGET_NAME}` and
   `$(SRCROOT)/$(BUILT_PRODUCTS_DIR)/$(INFOPLIST_PATH)`. Set the build setting `DEBUG_INFORMATION_FORMAT` to
   `DWARF with dSYM File` for release.

### Push notifications (Messaging)

- **iOS:** add the Push Notifications capability to the app's target (an `aps-environment` entitlement), and for silent pushes
  the `remote-notification` background mode (`UIBackgroundModes` in `Info.plist`). Upload an APNs authentication key
  (`.p8`) in the Firebase console, under Project settings, Cloud Messaging. The plugin asks iOS to register for remote
  notifications when it loads; `requestPermissions()` shows the permission prompt. It does not matter whether
  `FirebaseAppDelegateProxyEnabled` is on: the plugin hands the APNs token to Firebase itself.
- **Android:** nothing to add. The plugin declares the `POST_NOTIFICATIONS` permission and Firebase's messaging service;
  Android 13+ asks for the permission on `requestPermissions()`. To choose the small icon, colour or default channel of
  notifications that Firebase shows while the app is in the background, add the `com.google.firebase.messaging.default_notification_*`
  meta-data to the app's manifest, as for any FCM app.
- **Events** (`addListener`): `tokenReceived`, `notificationReceived`, `notificationActionPerformed`, `apnsTokenReceived`
  (iOS). Events that arrive before the page has a listener are kept and delivered to the first one, as in Capacitor.
- **Together with `tauri-plugin-notification`:** both use the notification center's delegate on iOS. This plugin takes it one
  run-loop turn after the plugins have loaded and keeps the delegate that was there, passing every call on to it, so the
  registration order does not matter. A delegate that the app sets later replaces this plugin's, and the events are lost.

### Advertising ID (IDFA / `AD_ID`)

The behaviour is the Capacitor plugins' default; nothing is removed:

- **Android:** `firebase-analytics` merges the `com.google.android.gms.permission.AD_ID` permission into the app's
  manifest. To drop it, add `<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />`
  to the app's manifest. Ad plugins (AdMob) need the permission, so keep it in that case.
- **iOS:** `FirebaseAnalytics` is linked, which includes IDFA support (the Capacitor plugin's default trait `Analytics`).
  Collecting it still requires the app's own App Tracking Transparency prompt. This port has no equivalent of the
  Capacitor `AnalyticsWithoutAdIdSupport` trait yet (see [docs/ROADMAP.md](docs/ROADMAP.md)).

Using them in an app that also shows ads (for example with an AdMob plugin) needs no extra steps from this side: the plugins
only add the Firebase SDK and leave the advertising ID as the Capacitor plugins do. The app is responsible for the consent
and tracking-transparency prompts.

## Crashlytics: what is collected

- Native crashes (Swift, Kotlin, Java, C/C++): collected by the Firebase SDK once it is initialised.
- `FirebaseCrashlytics.recordException()` records non-fatal JavaScript errors with their stack trace.
- A Rust `panic!` aborts the process: whether it appears in Crashlytics depends on the platform's crash handler. See
  [docs/TECH-NOTES.md §6](docs/TECH-NOTES.md).

## Known limits

What has been run, and what has not (details: [docs/TECH-NOTES.md §9](docs/TECH-NOTES.md)).

**Verified** (2026-11-21, against a real Firebase test project): every method of both plugins runs on the iOS Simulator
(Xcode 27) and on an Android emulator (API 36), and a native crash on Android shows up in the Crashlytics console.

**Not verified yet:**

- No physical device has been tried, on either platform.
- An iOS crash reaching the Crashlytics console (it needs the dSYM upload step in your build).
- Analytics events showing up in the Firebase console (the calls return without error; the console
  side has not been looked at).
- A Rust `panic!` on Android: it needs `firebase-crashlytics-ndk`, which is not wired in or tried.

**Limits you will meet:**

- Analytics on iOS needs Xcode 27 (the Swift package resolution of Xcode 26.6 picks macOS slices). Crashlytics alone builds
  with older Xcode.
- The iOS CI job covers Crashlytics only and does not run on pull requests.
- The advertising ID stays at the Capacitor plugins' defaults (see above).
- Android: `crash()` throws from the main looper, because Tauri catches exceptions thrown inside a command.

If one of these bites you, please open an issue.

## Following upstream

`@capacitor-firebase/*` and the Firebase SDK versions they use are pinned exactly. `.github/workflows/follow-upstream.yml`
runs daily, and when a release is out opens a pull request that bumps the pins and the native SDK versions, carries the
upstream source diff in its body and starts CI. The `apiParity` test fails if a method was added or removed upstream until
it is ported. See [docs/WORKFLOW.md §6](docs/WORKFLOW.md).

## Development

```bash
npm ci
npm run verify                         # format, build, types, tests (including apiParity)
cargo fmt --all --check
cargo clippy --workspace --all-targets -- -D warnings
cargo test --workspace
cargo check --workspace --target aarch64-apple-ios-sim --jobs 1  # Swift (Xcode 27; --jobs 1: the two plugins' SwiftPM downloads collide)
cargo check --workspace --target aarch64-linux-android     # then `gradle -p crates/<crate>/android compileDebugJavaWithJavac`
```

See [docs/WORKFLOW.md](docs/WORKFLOW.md) for branches, releases and verification, and
[docs/TECH-NOTES.md](docs/TECH-NOTES.md) for what was decided in the port.

## License

MIT for this repository's own code. Portions are derived from `@capacitor-firebase/analytics`,
`@capacitor-firebase/crashlytics` and `@capacitor-firebase/messaging` © Robin Genz and the Capawesome contributors, licensed under the Apache License 2.0.
See [LICENSE](LICENSE) (both texts) and [NOTICE](NOTICE).
