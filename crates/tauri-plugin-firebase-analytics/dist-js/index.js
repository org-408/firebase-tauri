// @capacitor-firebase/analytics: src/index.ts
//
// Capacitor's registerPlugin becomes the plugin's Tauri commands (createNativePlugin). Off iOS and Android the web
// stand-in answers, as in the Capacitor package.
import { getPlatform, invokeCommand } from './bridge.js';
import { COMMANDS } from './commands.js';
const PLUGIN = 'firebase-analytics';
function createNativePlugin() {
    const plugin = {};
    for (const [method, command] of Object.entries(COMMANDS)) {
        plugin[method] = async (options) => {
            const result = await invokeCommand(PLUGIN, command, options);
            // Tauri's "nothing" is null; the methods without a result resolve with undefined, as in Capacitor
            return result === null ? undefined : result;
        };
    }
    return plugin;
}
let native;
let web;
/** The native plugin on iOS and Android, the web stand-in elsewhere (Capacitor's registerPlugin with `web`) */
async function implementation() {
    if (getPlatform() === 'web') {
        web ??= import('./web.js').then((m) => new m.FirebaseAnalyticsWeb());
        return (await web);
    }
    return (native ??= createNativePlugin());
}
const FirebaseAnalytics = {};
for (const method of Object.keys(COMMANDS)) {
    FirebaseAnalytics[method] = async (...args) => {
        const target = await implementation();
        return target[method].apply(target, args);
    };
}
export * from './definitions.js';
export { FirebaseAnalytics };
export { TauriFirebaseException, ExceptionCode } from './bridge.js';
