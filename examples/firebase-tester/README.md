# firebase-tester

A Tauri app that calls every kind of command of `tauri-plugin-firebase-analytics` and `-crashlytics` on iOS and Android and
writes a report (`report.json` in the app's data folder; on Android also logcat, tag `firebase-tester`).

- **plugin** checks need no Firebase project: argument validation and `UNIMPLEMENTED` answers come from the plugins' own code.
- **firebase** checks call the Firebase SDK. They run after tapping "Use Firebase", and need a Firebase **test** project
  (never a production one): add its `GoogleService-Info.plist` / `google-services.json` as in the repository README.
  Without the config, iOS logs "Firebase was not configured" and the SDK calls must not be made, so they are skipped.

```bash
cd examples/firebase-tester
npm install                      # from the repository root
# iOS Simulator
npx tauri ios build --debug --target aarch64-sim
xcrun simctl install booted src-tauri/gen/apple/build/arm64-sim/firebase-tester.app
xcrun simctl launch booted com.org408.firebasetester
cat "$(xcrun simctl get_app_container booted com.org408.firebasetester data)/Library/Application Support/com.org408.firebasetester/report.json"
# Android (a debug build is large for a default emulator: use --apk for a release build and sign it with the debug key)
npx tauri android build --apk --target aarch64
```
