// @capacitor-firebase/crashlytics: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands (createNativePlugin). Off iOS and Android the web
// stand-in answers, as in the Capacitor package.
import { getPlatform, invokeCommand } from './bridge.js';
import { COMMANDS } from './commands.js';
import type { FirebaseCrashlyticsPlugin } from './definitions.js';

const PLUGIN = 'firebase-crashlytics';

type Methods = Record<string, (...args: unknown[]) => unknown>;

function createNativePlugin(): FirebaseCrashlyticsPlugin {
  const plugin: Methods = {};
  for (const [method, command] of Object.entries(COMMANDS)) {
    plugin[method] = async (options?: unknown) => {
      const result = await invokeCommand(PLUGIN, command, options);
      // Tauri's "nothing" is null; the methods without a result resolve with undefined, as in Capacitor
      return result === null ? undefined : result;
    };
  }
  return plugin as unknown as FirebaseCrashlyticsPlugin;
}

let native: FirebaseCrashlyticsPlugin | undefined;
let web: Promise<FirebaseCrashlyticsPlugin> | undefined;

/** The native plugin on iOS and Android, the web stand-in elsewhere (Capacitor's registerPlugin with `web`) */
async function implementation(): Promise<Methods> {
  if (getPlatform() === 'web') {
    web ??= import('./web.js').then((m) => new m.FirebaseCrashlyticsWeb());
    return (await web) as unknown as Methods;
  }
  return (native ??= createNativePlugin()) as unknown as Methods;
}

const FirebaseCrashlytics = {} as FirebaseCrashlyticsPlugin;
for (const method of Object.keys(COMMANDS)) {
  (FirebaseCrashlytics as unknown as Methods)[method] = async (...args: unknown[]) => {
    const target = await implementation();
    return (target[method] as (...a: unknown[]) => unknown).apply(target, args);
  };
}

export * from './definitions.js';
export { FirebaseCrashlytics };
export { TauriFirebaseException, ExceptionCode } from './bridge.js';
