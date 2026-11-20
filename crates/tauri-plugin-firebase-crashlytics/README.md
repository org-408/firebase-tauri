# tauri-plugin-firebase-crashlytics

Firebase Crashlytics for Tauri 2 on iOS and Android: a port of
[`@capacitor-firebase/crashlytics`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/crashlytics) 8.6.0.
Every method of the Capacitor plugin, with the same names, arguments, results and errors.

This folder is both the Rust crate (the Tauri plugin, with its Swift and Java code) and the npm package
`tauri-plugin-firebase-crashlytics-api` (the TypeScript API in `guest-js/`, built to `dist-js/`). See the
[repository's README](../../README.md) for installing, the Firebase setup and using it.

```ts
import { FirebaseCrashlytics } from 'tauri-plugin-firebase-crashlytics-api';
```

The API reference is the Capacitor plugin's: https://capawesome.io/plugins/firebase/crashlytics/

MIT. Portions are derived from `@capacitor-firebase/crashlytics` © Robin Genz and the Capawesome contributors (Apache-2.0); see
[LICENSE](../../LICENSE) and [NOTICE](../../NOTICE). An independent community project, not an official Tauri or Firebase plugin.
