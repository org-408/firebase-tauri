// The Tauri command for each method of @capacitor-firebase/messaging's native plugin, in the order of its definitions.ts: the method's name
// in snake_case. Keep in step with build.rs, src/commands.rs and permissions/default.toml (__tests__/apiParity.test.ts
// checks). `addListener` and `removeAllListeners` are not here: they use `register_listener` and `remove_listener`
// (build.rs), which Tauri's `addPluginListener` calls.
export const COMMANDS = {
    checkPermissions: 'check_permissions',
    requestPermissions: 'request_permissions',
    isSupported: 'is_supported',
    getToken: 'get_token',
    deleteToken: 'delete_token',
    getDeliveredNotifications: 'get_delivered_notifications',
    removeDeliveredNotifications: 'remove_delivered_notifications',
    removeAllDeliveredNotifications: 'remove_all_delivered_notifications',
    subscribeToTopic: 'subscribe_to_topic',
    unsubscribeFromTopic: 'unsubscribe_from_topic',
    createChannel: 'create_channel',
    deleteChannel: 'delete_channel',
    listChannels: 'list_channels',
};
