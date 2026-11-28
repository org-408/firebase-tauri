// @capacitor-firebase/messaging: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands (createNativePlugin), and `addListener` becomes Tauri's
// `addPluginListener` (the native plugin sends each event to the page's channel). Off iOS and Android the web
// stand-in answers, as in the Capacitor package.
import { addPluginListener } from '@tauri-apps/api/core';
import { getPlatform, invokeCommand, toException } from './bridge.js';
import { COMMANDS } from './commands.js';
const PLUGIN = 'firebase-messaging';
function createNativePlugin() {
    const plugin = {};
    for (const [method, command] of Object.entries(COMMANDS)) {
        plugin[method] = async (options) => {
            const result = await invokeCommand(PLUGIN, command, options);
            // Tauri's "nothing" is null; the methods without a result resolve with undefined, as in Capacitor
            return result === null ? undefined : result;
        };
    }
    // The events: one Tauri channel per listener, kept so that removeAllListeners can drop them
    const listeners = new Set();
    plugin.addListener = async (eventName, listenerFunc) => {
        try {
            const listener = await addPluginListener(PLUGIN, eventName, listenerFunc);
            listeners.add(listener);
            return {
                remove: async () => {
                    listeners.delete(listener);
                    await listener.unregister();
                },
            };
        }
        catch (error) {
            throw toException(error);
        }
    };
    plugin.removeAllListeners = async () => {
        const all = [...listeners];
        listeners.clear();
        await Promise.all(all.map((listener) => listener.unregister()));
    };
    return plugin;
}
let native;
let web;
/** The native plugin on iOS and Android, the web stand-in elsewhere (Capacitor's registerPlugin with `web`) */
async function implementation() {
    if (getPlatform() === 'web') {
        web ??= import('./web.js').then((m) => new m.FirebaseMessagingWeb());
        return (await web);
    }
    return (native ??= createNativePlugin());
}
const FirebaseMessaging = {};
for (const method of [...Object.keys(COMMANDS), 'addListener', 'removeAllListeners']) {
    FirebaseMessaging[method] = async (...args) => {
        const target = await implementation();
        return target[method].apply(target, args);
    };
}
export * from './definitions.js';
export { FirebaseMessaging };
export { TauriFirebaseException, ExceptionCode } from './bridge.js';
