// Derived from @capacitor-firebase/crashlytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import { WebPlugin } from './web-plugin.js';
export class FirebaseCrashlyticsWeb extends WebPlugin {
    async crash() {
        throw this.unimplemented('Not implemented on web.');
    }
    async setCustomKey(_options) {
        throw this.unimplemented('Not implemented on web.');
    }
    async setUserId(_options) {
        throw this.unimplemented('Not implemented on web.');
    }
    async log(_options) {
        throw this.unimplemented('Not implemented on web.');
    }
    async setEnabled(_options) {
        throw this.unimplemented('Not implemented on web.');
    }
    async isEnabled() {
        throw this.unimplemented('Not implemented on web.');
    }
    async didCrashOnPreviousExecution() {
        throw this.unimplemented('Not implemented on web.');
    }
    async sendUnsentReports() {
        throw this.unimplemented('Not implemented on web.');
    }
    async deleteUnsentReports() {
        throw this.unimplemented('Not implemented on web.');
    }
    async recordException(_options) {
        throw this.unimplemented('Not implemented on web.');
    }
}
