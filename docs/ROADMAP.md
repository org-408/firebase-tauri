# Roadmap

The task number is the GitHub issue number.

| Task | What                                                                                                                  | State                          |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| #1   | Port `@capacitor-firebase/analytics` and `crashlytics` 8.6.0 (all methods), v0.1.0, and the follow-upstream machinery | Done (v0.1.0, not yet on registries) |
| #16  | Port `@capacitor-firebase/messaging` 8.6.0 (FCM, push notifications), v0.1.1                                          | In progress (feature/T16-messaging) |

## Plan: publish to crates.io and npm

The plan is to publish the four packages (`tauri-plugin-firebase-analytics`, `tauri-plugin-firebase-crashlytics` and their
`-api` npm packages) and to announce them to the Tauri community. Publishing is a deliberate step taken by the maintainer,
not by CI, and it cannot be undone: the tag (`v0.1.0`) exists, the registries are not published to yet.

## Before publishing

- [ ] Adopt the plugins in a real app (ai-tarot-chat or Fabloom) and confirm Firebase works there: crashes arrive in
      Crashlytics and events show up in Analytics. Publishing waits for this.
- [ ] Run on a physical device, iOS and Android.
- [ ] iOS crash delivery to the Crashlytics console (needs the dSYM upload in the app's build).
- [ ] Rust `panic!` on Android (`firebase-crashlytics-ndk`, TECH-NOTES §6).
- [ ] Decide what to do about Xcode 26 for Analytics (today it needs Xcode 27 or later) and the iOS CI job, which covers
      Crashlytics only.
- [ ] Look at the first automatic upstream-tracking PR (`follow-upstream.yml`) to see it works end to end.

Problems found while adopting are fixed here and released as a new tag (v0.1.x), not by moving `v0.1.0` again.

## Not done (candidates)

- `AnalyticsWithoutAdIdSupport` for iOS (TECH-NOTES §7).
- Swift and Java unit tests of the helpers (consent mapping, bundle conversion, email and phone validation).

## Done

- All methods of `@capacitor-firebase/analytics` and `crashlytics` 8.6.0; `apiParity` guards the surface.
- All 18 checks on the iOS Simulator (Xcode 27) and an Android emulator (API 36) against a Firebase test project; a
  native Android crash seen in the Crashlytics console. Two bugs found that way are fixed (TECH-NOTES §9).
- Daily upstream tracking (`follow-upstream.yml`).
