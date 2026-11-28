# tauri-plugin-firebase-messaging

Firebase Cloud Messaging (push notifications) for Tauri 2 on iOS and Android: a port of
[`@capacitor-firebase/messaging`](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/messaging) 8.6.0.
Every method and event of the Capacitor plugin, with the same names, arguments, results and errors.

This folder is both the Rust crate (the Tauri plugin, with its Swift and Java code) and the npm package
`tauri-plugin-firebase-messaging-api` (the TypeScript API in `guest-js/`, built to `dist-js/`). See the
[repository's README](../../README.md) for installing, the Firebase setup and using it.

```ts
import { FirebaseMessaging } from 'tauri-plugin-firebase-messaging-api';

await FirebaseMessaging.requestPermissions();
const { token } = await FirebaseMessaging.getToken();
await FirebaseMessaging.addListener('notificationReceived', (event) => console.log(event.notification));
```

The API reference is the Capacitor plugin's: https://capawesome.io/plugins/firebase/messaging/

Differences from the Capacitor plugin (everything else is the same):

- The iOS foreground presentation options are set in `tauri.conf.json` under `plugins.firebase-messaging`
  (`{ "presentationOptions": ["badge", "sound", "alert"] }`), where Capacitor reads `plugins.FirebaseMessaging` of its own config.
- A Tauri app has no Capacitor `AppDelegate` bridge. On iOS the plugin wraps the app delegate's push callbacks itself and
  becomes the notification center's delegate, passing every call on to the delegate that was there before (for example the
  official `tauri-plugin-notification`'s); the registration order does not matter.
- iOS needs the Push Notifications capability (the `aps-environment` entitlement) and, for silent pushes, the
  `remote-notification` background mode. See the repository's README.

MIT. Portions are derived from `@capacitor-firebase/messaging` © Robin Genz and the Capawesome contributors (Apache-2.0); see
[LICENSE](../../LICENSE) and [NOTICE](../../NOTICE). An independent community project, not an official Tauri or Firebase plugin.
