# Roadmap

The task number is the GitHub issue number.

| Task | What                                                                                                                  | State                      |
| ---- | --------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| #1   | Port `@capacitor-firebase/analytics` and `crashlytics` 8.6.0 (all methods), v0.1.0, and the follow-upstream machinery | In progress (this branch)  |

## Not done in v0.1.0 (candidates)

- Verification in a running app on an iOS simulator and an Android emulator with a Firebase **test** project, including
  Crashlytics' automatic collection (TECH-NOTES §6).
- `AnalyticsWithoutAdIdSupport` for iOS (TECH-NOTES §7).
- Publishing to crates.io and npm (docs/WORKFLOW.md §3): after the maintainers confirm.
- Swift and Java unit tests of the helpers (consent mapping, bundle conversion, email and phone validation).
