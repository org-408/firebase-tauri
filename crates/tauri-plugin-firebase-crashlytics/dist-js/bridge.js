// What stands in for Capacitor's bridge: which platform the page runs on, the call to the native plugin through
// Tauri, and the error a rejection becomes (Capacitor's CapacitorException).
import { invoke } from '@tauri-apps/api/core';
/** Capacitor's ExceptionCode */
export var ExceptionCode;
(function (ExceptionCode) {
    ExceptionCode["Unimplemented"] = "UNIMPLEMENTED";
    ExceptionCode["Unavailable"] = "UNAVAILABLE";
})(ExceptionCode || (ExceptionCode = {}));
/** What a rejected call throws, as Capacitor's `CapacitorException`: an `Error` with the plugin's `code` and `data` */
export class TauriFirebaseException extends Error {
    code;
    data;
    constructor(message, code, data) {
        super(message);
        this.message = message;
        this.code = code;
        this.data = data;
    }
}
/** Where the page runs: `ios` and `android` call the native plugin; anywhere else uses the web stand-in, as Capacitor does */
export function getPlatform() {
    const platform = globalThis
        .__TAURI_FIREBASE_CRASHLYTICS__?.platform;
    return platform === 'ios' || platform === 'android' ? platform : 'web';
}
/** What Tauri rejects with (the Rust side's `{ code, message }`, or a message) as the exception */
export function toException(error) {
    if (error instanceof Error) {
        return error;
    }
    if (typeof error === 'string') {
        return new TauriFirebaseException(error);
    }
    if (typeof error === 'object' && error !== null) {
        const { code, message, data } = error;
        return new TauriFirebaseException(typeof message === 'string' ? message : '', typeof code === 'string' ? code : undefined, data);
    }
    return error;
}
/** Calls the plugin's command with the options as the page passes them */
export async function invokeCommand(plugin, command, options) {
    try {
        return await invoke(`plugin:${plugin}|${command}`, (options ?? {}));
    }
    catch (error) {
        throw toException(error);
    }
}
