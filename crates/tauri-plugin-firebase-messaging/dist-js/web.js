// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import { WebPlugin } from './web-plugin.js';
import { deleteToken, getMessaging, getToken, isSupported as isSupportedInWeb, onMessage } from 'firebase/messaging';
export class FirebaseMessagingWeb extends WebPlugin {
    static notificationReceivedEvent = 'notificationReceived';
    constructor() {
        super();
        isSupportedInWeb().then((supported) => {
            if (!supported) {
                return;
            }
            const messaging = getMessaging();
            onMessage(messaging, (payload) => this.handleNotificationReceived(payload));
        });
    }
    async checkPermissions() {
        const isSupported = await isSupportedInWeb();
        if (!isSupported) {
            return { receive: 'denied' };
        }
        const receive = this.convertNotificationPermissionToPermissionState(Notification.permission);
        return { receive };
    }
    async requestPermissions() {
        const isSupported = await isSupportedInWeb();
        if (!isSupported) {
            return { receive: 'denied' };
        }
        const notificationPermission = await Notification.requestPermission();
        const receive = this.convertNotificationPermissionToPermissionState(notificationPermission);
        return { receive };
    }
    async isSupported() {
        const isSupported = await isSupportedInWeb();
        return { isSupported };
    }
    async getToken(options) {
        const messaging = getMessaging();
        const token = await getToken(messaging, {
            vapidKey: options?.vapidKey,
            serviceWorkerRegistration: options?.serviceWorkerRegistration,
        });
        return { token };
    }
    async deleteToken() {
        const messaging = getMessaging();
        await deleteToken(messaging);
    }
    async getDeliveredNotifications() {
        this.throwUnimplementedError();
    }
    async removeDeliveredNotifications(_options) {
        this.throwUnimplementedError();
    }
    async removeAllDeliveredNotifications() {
        this.throwUnimplementedError();
    }
    async subscribeToTopic(_options) {
        this.throwUnimplementedError();
    }
    async unsubscribeFromTopic(_options) {
        this.throwUnimplementedError();
    }
    async createChannel(_options) {
        this.throwUnimplementedError();
    }
    async deleteChannel(_options) {
        this.throwUnimplementedError();
    }
    async listChannels() {
        this.throwUnimplementedError();
    }
    handleNotificationReceived(messagePayload) {
        const notification = this.createNotificationResult(messagePayload);
        const event = { notification };
        this.notifyListeners(FirebaseMessagingWeb.notificationReceivedEvent, event);
    }
    createNotificationResult(messagePayload) {
        return {
            body: messagePayload.notification?.body,
            data: messagePayload.data,
            id: messagePayload.messageId,
            image: messagePayload.notification?.image,
            title: messagePayload.notification?.title,
        };
    }
    convertNotificationPermissionToPermissionState(permission) {
        let state = 'prompt';
        switch (permission) {
            case 'granted':
                state = 'granted';
                break;
            case 'denied':
                state = 'denied';
                break;
        }
        return state;
    }
    throwUnimplementedError() {
        throw this.unimplemented('Not implemented on web.');
    }
}
