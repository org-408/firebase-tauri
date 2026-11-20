// @capacitor-firebase/analytics: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands (createNativePlugin). Off iOS and Android the web
// stand-in answers, as in the Capacitor package.
import { getPlatform, invokeCommand } from './bridge.js';
import { COMMANDS } from './commands.js';
import type { FirebaseAnalyticsPlugin } from './definitions.js';

const PLUGIN = 'firebase-analytics';

type Methods = Record<string, (...args: unknown[]) => unknown>;

function createNativePlugin(): FirebaseAnalyticsPlugin {
  const plugin: Methods = {};
  for (const [method, command] of Object.entries(COMMANDS)) {
    plugin[method] = async (options?: unknown) => {
      const result = await invokeCommand(PLUGIN, command, options);
      // Tauri's "nothing" is null; the methods without a result resolve with undefined, as in Capacitor
      return result === null ? undefined : result;
    };
  }
  return plugin as unknown as FirebaseAnalyticsPlugin;
}

let native: FirebaseAnalyticsPlugin | undefined;
let web: Promise<FirebaseAnalyticsPlugin> | undefined;

/** The native plugin on iOS and Android, the web stand-in elsewhere (Capacitor's registerPlugin with `web`) */
async function implementation(): Promise<Methods> {
  if (getPlatform() === 'web') {
    web ??= import('./web.js').then((m) => new m.FirebaseAnalyticsWeb());
    return (await web) as unknown as Methods;
  }
  return (native ??= createNativePlugin()) as unknown as Methods;
}

const FirebaseAnalytics = {} as FirebaseAnalyticsPlugin;
for (const method of Object.keys(COMMANDS)) {
  (FirebaseAnalytics as unknown as Methods)[method] = async (...args: unknown[]) => {
    const target = await implementation();
    return (target[method] as (...a: unknown[]) => unknown).apply(target, args);
  };
}

export * from './definitions.js';
export { FirebaseAnalytics };
export { TauriFirebaseException, ExceptionCode } from './bridge.js';
