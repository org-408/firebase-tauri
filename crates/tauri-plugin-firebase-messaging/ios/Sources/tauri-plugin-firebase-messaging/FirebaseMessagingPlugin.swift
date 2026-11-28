// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import WebKit
import Tauri
import UserNotifications

import FirebaseMessaging
import FirebaseCore

// @capacitor-firebase/messaging: ios/Plugin/FirebaseMessagingPlugin.swift
//
// The same plugin on Tauri: Capacitor's call is Tauri's `Invoke` wrapped in `PluginCall` (PluginCall.swift), and
// `notifyListeners` sends to the channels the page registered (`registerListener`). Events that come before the page
// listens are kept until it does, as Capacitor's `retainUntilConsumed`. Everything else is the Capacitor plugin's.

/// The plugin's settings in `plugins.firebase-messaging` of `tauri.conf.json` (Capacitor: `plugins.FirebaseMessaging`)
private struct MessagingConfigFile: Decodable {
    var presentationOptions: [String]?
}

@objc(FirebaseMessagingPlugin)
public class FirebaseMessagingPlugin: Plugin {
    public let tag = "FirebaseMessaging"
    public let tokenReceivedEvent = "tokenReceived"
    public let notificationReceivedEvent = "notificationReceived"
    public let notificationActionPerformedEvent = "notificationActionPerformed"
    public let apnsTokenReceivedEvent = "apnsTokenReceived"
    public let errorFirebaseNotConfigured = "Firebase is not configured: GoogleService-Info.plist is missing from the app bundle."
    public let errorTopicMissing = "topic must be provided."
    public let errorNotificationsMissing = "notifications must be provided."
    public let errorNotificationsInvalid = "The provided notifications are invalid."
    private var implementation: FirebaseMessaging?
    private var channels = [String: [Channel]]()
    private var retainedEvents = [String: [[String: Any]]]()
    private let lock = NSLock()

    override public func load(webview: WKWebView) {
        implementation = FirebaseMessaging(plugin: self, config: firebaseMessagingConfig())
    }

    @objc override public func checkPermissions(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.checkPermissions(completion: { permission in
            call.resolve([
                "receive": permission
            ])
        })
    }

    @objc override public func requestPermissions(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.requestPermissions(completion: { granted, error in
            if let error = error {
                NSLog("%@", "[\(self.tag)] \(error)")
                call.reject(error.localizedDescription)
                return
            }
            call.resolve(["receive": granted ? "granted" : "denied"])
        })
    }

    @objc public func isSupported(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        var result = JSObject()
        result["isSupported"] = true
        call.resolve(result)
    }

    @objc public func getToken(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard isFirebaseConfigured else {
            rejectCallAsUnavailable(call)
            return
        }

        implementation?.getToken(completion: { token, error in
            if let error = error {
                NSLog("%@", "[\(self.tag)] \(error)")
                call.reject(error.localizedDescription)
                return
            }
            var result = JSObject()
            result["token"] = token
            call.resolve(result)
        })
    }

    @objc public func deleteToken(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard isFirebaseConfigured else {
            rejectCallAsUnavailable(call)
            return
        }

        implementation?.deleteToken(completion: { error in
            if let error = error {
                NSLog("%@", "[\(self.tag)] \(error)")
                call.reject(error.localizedDescription)
                return
            }
            call.resolve()
        })
    }

    @objc public func getDeliveredNotifications(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.getDeliveredNotifications(completion: { notifications in
            let notificationResults = notifications.map({ notification in
                return FirebaseMessagingHelper.createNotificationResult(notification: notification)
            })
            call.resolve([
                "notifications": notificationResults
            ])
        })
    }

    @objc public func removeDeliveredNotifications(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let notifications = call.getArray("notifications", JSObject.self) else {
            call.reject(errorNotificationsMissing)
            return
        }

        var ids = [String]()
        for notification in notifications {
            guard let id = notification["id"] as? String else {
                call.reject(errorNotificationsInvalid)
                return
            }
            ids.append(id)
        }

        implementation?.removeDeliveredNotifications(ids: ids)
        call.resolve()
    }

    @objc public func removeAllDeliveredNotifications(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.removeAllDeliveredNotifications()
        call.resolve()
    }

    @objc public func subscribeToTopic(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard isFirebaseConfigured else {
            rejectCallAsUnavailable(call)
            return
        }

        guard let topic = call.getString("topic") else {
            call.reject(errorTopicMissing)
            return
        }

        implementation?.subscribeToTopic(topic: topic, completion: { error in
            if let error = error {
                NSLog("%@", "[\(self.tag)] \(error)")
                call.reject(error.localizedDescription)
                return
            }
            call.resolve()
        })
    }

    @objc public func unsubscribeFromTopic(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard isFirebaseConfigured else {
            rejectCallAsUnavailable(call)
            return
        }

        guard let topic = call.getString("topic") else {
            call.reject(errorTopicMissing)
            return
        }

        implementation?.unsubscribeFromTopic(topic: topic, completion: { error in
            if let error = error {
                NSLog("%@", "[\(self.tag)] \(error)")
                call.reject(error.localizedDescription)
                return
            }
            call.resolve()
        })
    }

    @objc public func createChannel(_ invoke: Invoke) {
        PluginCall(invoke).unimplemented("Not implemented on iOS.")
    }

    @objc public func deleteChannel(_ invoke: Invoke) {
        PluginCall(invoke).unimplemented("Not implemented on iOS.")
    }

    @objc public func listChannels(_ invoke: Invoke) {
        PluginCall(invoke).unimplemented("Not implemented on iOS.")
    }

    // MARK: the page's listeners (Capacitor's addListener / notifyListeners)

    private struct RegisterListenerArgs: Decodable {
        let event: String
        let handler: Channel
    }

    private struct RemoveListenerArgs: Decodable {
        let event: String
        let channelId: UInt64
    }

    // Tauri's own `registerListener` keeps the channels out of this plugin's reach (and cannot be replaced from here), so
    // the page's listeners come through these two commands, which keep them and send the events that came before the
    // page listened.
    @objc public func registerEventListener(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(RegisterListenerArgs.self)
        lock.lock()
        channels[args.event, default: []].append(args.handler)
        let retained = retainedEvents.removeValue(forKey: args.event)
        lock.unlock()
        invoke.resolve()
        retained?.forEach { notifyListeners(args.event, data: $0, retainUntilConsumed: true) }
    }

    @objc public func removeEventListener(_ invoke: Invoke) throws {
        let args = try invoke.parseArgs(RemoveListenerArgs.self)
        lock.lock()
        channels[args.event] = channels[args.event]?.filter { $0.id != args.channelId }
        lock.unlock()
        invoke.resolve()
    }

    /// Capacitor's notifyListeners(event, data, retainUntilConsumed)
    private func notifyListeners(_ event: String, data: [String: Any], retainUntilConsumed: Bool) {
        lock.lock()
        let listeners = channels[event] ?? []
        if listeners.isEmpty && retainUntilConsumed {
            retainedEvents[event, default: []].append(data)
        }
        lock.unlock()
        for channel in listeners {
            channel.send(data as JsonObject)
        }
    }

    func handleTokenReceived(token: String?) {
        guard let token = token else {
            return
        }
        var result = JSObject()
        result["token"] = token
        notifyListeners(tokenReceivedEvent, data: result, retainUntilConsumed: true)
    }

    func handleNotificationReceived(notification: UNNotification) {
        let notificationResult = FirebaseMessagingHelper.createNotificationResult(notification: notification)
        var result = JSObject()
        result["notification"] = notificationResult
        notifyListeners(notificationReceivedEvent, data: result, retainUntilConsumed: true)
    }

    func handleRemoteNotificationReceived(userInfo: [AnyHashable: Any]) {
        let notificationResult = FirebaseMessagingHelper.createNotificationResult(userInfo: userInfo)
        var result = JSObject()
        result["notification"] = notificationResult
        notifyListeners(notificationReceivedEvent, data: result, retainUntilConsumed: true)
    }

    func handleNotificationActionPerformed(response: UNNotificationResponse) {
        let notificationResult = FirebaseMessagingHelper.createNotificationResult(notification: response.notification)
        var result = JSObject()
        result["notification"] = notificationResult
        if response.actionIdentifier == UNNotificationDefaultActionIdentifier {
            result["actionId"] = "tap"
        } else if response.actionIdentifier == UNNotificationDismissActionIdentifier {
            result["actionId"] = "dismiss"
        } else {
            result["actionId"] = response.actionIdentifier
        }
        if let inputType = response as? UNTextInputNotificationResponse {
            result["inputValue"] = inputType.userText
        }
        notifyListeners(notificationActionPerformedEvent, data: result, retainUntilConsumed: true)
    }

    func handleApnsTokenReceived(token deviceToken: Data) {
        let token = deviceToken.reduce("", {$0 + String(format: "%02X", $1)})
        var result = JSObject()
        result["token"] = token
        notifyListeners(apnsTokenReceivedEvent, data: result, retainUntilConsumed: true)
    }

    private var isFirebaseConfigured: Bool {
        return implementation?.isFirebaseConfigured == true
    }

    private func rejectCallAsUnavailable(_ call: PluginCall) {
        call.unavailable(errorFirebaseNotConfigured)
    }

    private func firebaseMessagingConfig() -> FirebaseMessagingConfig {
        var config = FirebaseMessagingConfig()

        if let file = try? parseConfig(MessagingConfigFile.self), let presentationOptions = file.presentationOptions {
            config.presentationOptions = presentationOptions
        }

        return config
    }
}

@_cdecl("init_plugin_firebase_messaging")
public func initPlugin() -> Plugin {
    return FirebaseMessagingPlugin()
}
