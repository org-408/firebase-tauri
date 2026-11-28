// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import Tauri
import UserNotifications

class FirebaseMessagingHelper {
    static func createNotificationResult(notification: UNNotification) -> JSObject {
        var result = JSObject()
        result["body"] = notification.request.content.body
        result["data"] = userInfoToJSON(notification.request.content.userInfo)
        result["id"] = notification.request.identifier
        result["subtitle"] = notification.request.content.subtitle
        result["title"] = notification.request.content.title
        return result
    }

    /// A notification that arrived without the system showing it (a silent push): only its data
    static func createNotificationResult(userInfo: [AnyHashable: Any]?) -> JSObject {
        var result = JSObject()
        result["data"] = userInfoToJSON(userInfo)
        return result
    }

    /// Capacitor's JSTypes.coerceDictionaryToJSObject: the payload as JSON values
    static func userInfoToJSON(_ userInfo: [AnyHashable: Any]?) -> JSObject {
        guard let userInfo = userInfo else {
            return [:]
        }
        return (JSTypes.coerceDictionaryToJSObject(userInfo as NSDictionary) ?? [:]) as JSObject
    }
}
