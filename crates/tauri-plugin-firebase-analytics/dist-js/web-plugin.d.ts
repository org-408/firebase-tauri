import { TauriFirebaseException } from './bridge.js';
/** Capacitor's PluginListenerHandle */
export interface PluginListenerHandle {
    remove: () => Promise<void>;
}
type ListenerCallback = (err: any, ...args: any[]) => void;
export declare class WebPlugin {
    protected listeners: {
        [eventName: string]: ListenerCallback[];
    };
    protected retainedEventArguments: {
        [eventName: string]: any[];
    };
    addListener(eventName: string, listenerFunc: ListenerCallback): Promise<PluginListenerHandle>;
    removeAllListeners(): Promise<void>;
    protected notifyListeners(eventName: string, data: any, retainUntilConsumed?: boolean): void;
    protected hasListeners(eventName: string): boolean;
    protected unimplemented(msg?: string): TauriFirebaseException;
    protected unavailable(msg?: string): TauriFirebaseException;
    private removeListener;
    private sendRetainedArgumentsForEvent;
}
export {};
