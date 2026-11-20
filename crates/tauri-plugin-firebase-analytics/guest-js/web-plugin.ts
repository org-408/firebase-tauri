// Capacitor's WebPlugin (@capacitor/core), the base of purchases-capacitor's web stand-in (web.ts): listeners and the
// "not implemented" / "not available" errors. Window listeners are left out (the stand-ins do not use them).
import { ExceptionCode, TauriFirebaseException } from './bridge.js';

/** Capacitor's PluginListenerHandle */
export interface PluginListenerHandle {
  remove: () => Promise<void>;
}

type ListenerCallback = (err: any, ...args: any[]) => void;

export class WebPlugin {
  protected listeners: { [eventName: string]: ListenerCallback[] } = {};
  protected retainedEventArguments: { [eventName: string]: any[] } = {};

  addListener(eventName: string, listenerFunc: ListenerCallback): Promise<PluginListenerHandle> {
    let firstListener = false;
    const listeners = this.listeners[eventName];
    if (!listeners) {
      this.listeners[eventName] = [];
      firstListener = true;
    }
    this.listeners[eventName]!.push(listenerFunc);
    if (firstListener) {
      this.sendRetainedArgumentsForEvent(eventName);
    }
    const remove = async () => this.removeListener(eventName, listenerFunc);
    return Promise.resolve({ remove });
  }

  async removeAllListeners(): Promise<void> {
    this.listeners = {};
  }

  protected notifyListeners(eventName: string, data: any, retainUntilConsumed?: boolean): void {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      if (retainUntilConsumed) {
        let args = this.retainedEventArguments[eventName];
        if (!args) {
          args = [];
        }
        args.push(data);
        this.retainedEventArguments[eventName] = args;
      }
      return;
    }
    listeners.forEach((listener) => listener(data));
  }

  protected hasListeners(eventName: string): boolean {
    return !!this.listeners[eventName]?.length;
  }

  protected unimplemented(msg = 'not implemented'): TauriFirebaseException {
    return new TauriFirebaseException(msg, ExceptionCode.Unimplemented);
  }

  protected unavailable(msg = 'not available'): TauriFirebaseException {
    return new TauriFirebaseException(msg, ExceptionCode.Unavailable);
  }

  private async removeListener(eventName: string, listenerFunc: ListenerCallback): Promise<void> {
    const listeners = this.listeners[eventName];
    if (!listeners) {
      return;
    }
    const index = listeners.indexOf(listenerFunc);
    this.listeners[eventName]!.splice(index, 1);
  }

  private sendRetainedArgumentsForEvent(eventName: string): void {
    const args = this.retainedEventArguments[eventName];
    if (!args) {
      return;
    }
    delete this.retainedEventArguments[eventName];
    args.forEach((arg) => {
      this.notifyListeners(eventName, arg);
    });
  }
}
