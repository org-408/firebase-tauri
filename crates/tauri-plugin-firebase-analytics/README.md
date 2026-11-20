# tauri-plugin-firebase-analytics

Firebase Analytics for Tauri 2 on iOS and Android: a port of
[`@capacitor-firebase/analytics`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/analytics) 8.6.0.
Every method of the Capacitor plugin, with the same names, arguments, results and errors.

This folder is both the Rust crate (the Tauri plugin, with its Swift and Java code) and the npm package
`tauri-plugin-firebase-analytics-api` (the TypeScript API in `guest-js/`, built to `dist-js/`). See the
[repository's README](../../README.md) for installing, the Firebase setup and using it.

```ts
import { FirebaseAnalytics } from 'tauri-plugin-firebase-analytics-api';
```

The API reference is the Capacitor plugin's: https://capawesome.io/plugins/firebase/analytics/

MIT. Portions are derived from `@capacitor-firebase/analytics` © Robin Genz and the Capawesome contributors (Apache-2.0); see
[LICENSE](../../LICENSE) and [NOTICE](../../NOTICE). An independent community project, not an official Tauri or Firebase plugin.
