// Capacitor's WebPlugin (@capacitor/core), the base of purchases-capacitor's web stand-in (web.ts): listeners and the
// "not implemented" / "not available" errors. Window listeners are left out (the stand-ins do not use them).
import { ExceptionCode, TauriFirebaseException } from './bridge.js';
export class WebPlugin {
    listeners = {};
    retainedEventArguments = {};
    addListener(eventName, listenerFunc) {
        let firstListener = false;
        const listeners = this.listeners[eventName];
        if (!listeners) {
            this.listeners[eventName] = [];
            firstListener = true;
        }
        this.listeners[eventName].push(listenerFunc);
        if (firstListener) {
            this.sendRetainedArgumentsForEvent(eventName);
        }
        const remove = async () => this.removeListener(eventName, listenerFunc);
        return Promise.resolve({ remove });
    }
    async removeAllListeners() {
        this.listeners = {};
    }
    notifyListeners(eventName, data, retainUntilConsumed) {
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
    hasListeners(eventName) {
        return !!this.listeners[eventName]?.length;
    }
    unimplemented(msg = 'not implemented') {
        return new TauriFirebaseException(msg, ExceptionCode.Unimplemented);
    }
    unavailable(msg = 'not available') {
        return new TauriFirebaseException(msg, ExceptionCode.Unavailable);
    }
    async removeListener(eventName, listenerFunc) {
        const listeners = this.listeners[eventName];
        if (!listeners) {
            return;
        }
        const index = listeners.indexOf(listenerFunc);
        this.listeners[eventName].splice(index, 1);
    }
    sendRetainedArgumentsForEvent(eventName) {
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
