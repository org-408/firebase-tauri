// @capacitor-firebase/messaging: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands (createNativePlugin), and `addListener` becomes Tauri's
// `addPluginListener` (the native plugin sends each event to the page's channel). Off iOS and Android the web
// stand-in answers, as in the Capacitor package.
import { addPluginListener, type PluginListener } from '@tauri-apps/api/core';

import { getPlatform, invokeCommand, toException } from './bridge.js';
import { COMMANDS } from './commands.js';
import type { FirebaseMessagingPlugin } from './definitions.js';

const PLUGIN = 'firebase-messaging';

type Methods = Record<string, (...args: unknown[]) => unknown>;

function createNativePlugin(): FirebaseMessagingPlugin {
  const plugin: Methods = {};
  for (const [method, command] of Object.entries(COMMANDS)) {
    plugin[method] = async (options?: unknown) => {
      const result = await invokeCommand(PLUGIN, command, options);
      // Tauri's "nothing" is null; the methods without a result resolve with undefined, as in Capacitor
      return result === null ? undefined : result;
    };
  }

  // The events: one Tauri channel per listener, kept so that removeAllListeners can drop them
  const listeners = new Set<PluginListener>();
  plugin.addListener = async (eventName: unknown, listenerFunc: unknown) => {
    try {
      const listener = await addPluginListener(PLUGIN, eventName as string, listenerFunc as (payload: unknown) => void);
      listeners.add(listener);
      return {
        remove: async () => {
          listeners.delete(listener);
          await listener.unregister();
        },
      };
    } catch (error) {
      throw toException(error);
    }
  };
  plugin.removeAllListeners = async () => {
    const all = [...listeners];
    listeners.clear();
    await Promise.all(all.map((listener) => listener.unregister()));
  };
  return plugin as unknown as FirebaseMessagingPlugin;
}

let native: FirebaseMessagingPlugin | undefined;
let web: Promise<FirebaseMessagingPlugin> | undefined;

/** The native plugin on iOS and Android, the web stand-in elsewhere (Capacitor's registerPlugin with `web`) */
async function implementation(): Promise<Methods> {
  if (getPlatform() === 'web') {
    web ??= import('./web.js').then((m) => new m.FirebaseMessagingWeb());
    return (await web) as unknown as Methods;
  }
  return (native ??= createNativePlugin()) as unknown as Methods;
}

const FirebaseMessaging = {} as FirebaseMessagingPlugin;
for (const method of [...Object.keys(COMMANDS), 'addListener', 'removeAllListeners']) {
  (FirebaseMessaging as unknown as Methods)[method] = async (...args: unknown[]) => {
    const target = await implementation();
    return (target[method] as (...a: unknown[]) => unknown).apply(target, args);
  };
}

export * from './definitions.js';
export { FirebaseMessaging };
export { TauriFirebaseException, ExceptionCode } from './bridge.js';
