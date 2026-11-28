/** Capacitor's ExceptionCode */
export declare enum ExceptionCode {
    Unimplemented = "UNIMPLEMENTED",
    Unavailable = "UNAVAILABLE"
}
/** What a rejected call throws, as Capacitor's `CapacitorException`: an `Error` with the plugin's `code` and `data` */
export declare class TauriFirebaseException extends Error {
    code?: string;
    data?: unknown;
    constructor(message: string, code?: string, data?: unknown);
}
/** Where the page runs: `ios` and `android` call the native plugin; anywhere else uses the web stand-in, as Capacitor does */
export declare function getPlatform(): 'ios' | 'android' | 'web';
/** What Tauri rejects with (the Rust side's `{ code, message }`, or a message) as the exception */
export declare function toException(error: unknown): unknown;
/** Calls the plugin's command with the options as the page passes them */
export declare function invokeCommand<T>(plugin: string, command: string, options?: unknown): Promise<T>;
