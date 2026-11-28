// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import UserNotifications
import UIKit

import FirebaseMessaging
import FirebaseCore

@objc public class FirebaseMessaging: NSObject {
    private let plugin: FirebaseMessagingPlugin
    private let config: FirebaseMessagingConfig
    /// The delegate the app had before this plugin (for example the official notification plugin's): it is still told
    private var previousDelegate: UNUserNotificationCenterDelegate?

    init(plugin: FirebaseMessagingPlugin, config: FirebaseMessagingConfig) {
        self.plugin = plugin
        self.config = config
        super.init()
        if FirebaseApp.app() == nil {
            guard FirebaseOptions.defaultOptions() != nil else {
                NSLog("%@", "[FirebaseMessaging] Firebase was not configured: GoogleService-Info.plist is missing from the app bundle.")
                return
            }
            FirebaseApp.configure()
        }
        Messaging.messaging().delegate = self
        DispatchQueue.main.async {
            let center = UNUserNotificationCenter.current()
            if center.delegate !== self {
                self.previousDelegate = center.delegate
                center.delegate = self
            }
            AppDelegateHooks.onDeviceToken = { [weak self] token in self?.handleApnsToken(token) }
            AppDelegateHooks.onRemoteNotification = { [weak self] userInfo in self?.handleRemoteNotificationReceived(userInfo: userInfo) }
            AppDelegateHooks.install()
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    public var isFirebaseConfigured: Bool {
        return FirebaseApp.app() != nil
    }

    public func requestPermissions(completion: @escaping (_ granted: Bool, _ error: Error?) -> Void) {
        var options = UNAuthorizationOptions()
        options.insert(.alert)
        options.insert(.badge)
        options.insert(.sound)
        if self.config.presentationOptions.contains("criticalAlert") {
            options.insert(.criticalAlert)
        }
        UNUserNotificationCenter.current().requestAuthorization(options: options) { granted, error in
            completion(granted, error)
        }
    }

    public func checkPermissions(completion: @escaping (_ status: String) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { settings in
            let permission: String

            switch settings.authorizationStatus {
            case .authorized, .ephemeral, .provisional:
                permission = "granted"
            case .denied:
                permission = "denied"
            case .notDetermined:
                permission = "prompt"
            @unknown default:
                permission = "prompt"
            }

            completion(permission)
        }
    }

    public func getToken(completion: @escaping (String?, Error?) -> Void) {
        Messaging.messaging().isAutoInitEnabled = true
        Messaging.messaging().token(completion: { result, error in
            if let error = error {
                completion(nil, error)
                return
            }
            completion(result, nil)
        })
    }

    public func deleteToken(completion: @escaping (Error?) -> Void) {
        Messaging.messaging().deleteToken(completion: { error in
            if let error = error {
                completion(error)
                return
            }
            completion(nil)
        })
    }

    public func getDeliveredNotifications(completion: @escaping ([UNNotification]) -> Void) {
        UNUserNotificationCenter.current().getDeliveredNotifications { notifications in
            completion(notifications)
        }
    }

    public func removeDeliveredNotifications(ids: [String]) {
        UNUserNotificationCenter.current().removeDeliveredNotifications(withIdentifiers: ids)
    }

    public func removeAllDeliveredNotifications() {
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }

    public func subscribeToTopic(topic: String, completion: @escaping (Error?) -> Void) {
        Messaging.messaging().subscribe(toTopic: topic) { error in
            if let error = error {
                completion(error)
                return
            }
            completion(nil)
        }
    }

    public func unsubscribeFromTopic(topic: String, completion: @escaping (Error?) -> Void) {
        Messaging.messaging().unsubscribe(fromTopic: topic, completion: { error in
            if let error = error {
                completion(error)
                return
            }
            completion(nil)
        })
    }

    /// The APNs device token: handed to Firebase (it maps it to the FCM token) and to the page as `apnsTokenReceived`
    private func handleApnsToken(_ token: Data) {
        guard isFirebaseConfigured else {
            return
        }
        Messaging.messaging().apnsToken = token
        self.plugin.handleApnsTokenReceived(token: token)
    }

    public func handleRemoteNotificationReceived(userInfo: [AnyHashable: Any]) {
        guard isFirebaseConfigured else {
            return
        }
        Messaging.messaging().appDidReceiveMessage(userInfo)
        self.plugin.handleRemoteNotificationReceived(userInfo: userInfo)
    }

    private func handleNotificationReceived(notification: UNNotification) {
        let userInfo = notification.request.content.userInfo
        Messaging.messaging().appDidReceiveMessage(userInfo)
        self.plugin.handleNotificationReceived(notification: notification)
    }

    private func handleNotificationActionPerformed(response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        Messaging.messaging().appDidReceiveMessage(userInfo)
        self.plugin.handleNotificationActionPerformed(response: response)
    }
}

// Capacitor's NotificationRouter hands these two calls to the plugin; here the plugin is the notification center's delegate.
extension FirebaseMessaging: UNUserNotificationCenterDelegate {
    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        self.handleNotificationReceived(notification: notification)

        var presentationOptions = UNNotificationPresentationOptions.init()
        self.config.presentationOptions.forEach { option in
            switch option {
            case "alert":
                presentationOptions.insert(.banner)
                presentationOptions.insert(.list)
            case "badge":
                presentationOptions.insert(.badge)
            case "sound":
                presentationOptions.insert(.sound)
            default:
                print("Unrecogizned presentation option: \(option)")
            }
        }

        if let previous = previousDelegate,
           previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:))) {
            let options = presentationOptions
            previous.userNotificationCenter?(center, willPresent: notification) { previousOptions in
                completionHandler(options.union(previousOptions))
            }
        } else {
            completionHandler(presentationOptions)
        }
    }

    public func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        self.handleNotificationActionPerformed(response: response)

        if let previous = previousDelegate,
           previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:))) {
            previous.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
        } else {
            completionHandler()
        }
    }
}

extension FirebaseMessaging: MessagingDelegate {
    public func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
        self.plugin.handleTokenReceived(token: fcmToken)
    }
}
