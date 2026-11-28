// Derived from @capacitor-firebase/messaging 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import ObjectiveC
import UIKit

/// Capacitor's AppDelegate posts the APNs token and the silent pushes to its plugins. A Tauri app has no such bridge:
/// these two methods of the app's delegate are wrapped instead (what the Firebase SDK's own proxy does as well), and the
/// wrapper calls the delegate's method first, so the app's and Firebase's own handling stays as it was.
enum AppDelegateHooks {
    static var onDeviceToken: ((Data) -> Void)?
    static var onRemoteNotification: (([AnyHashable: Any]) -> Void)?
    private static var installed = false

    static func install() {
        guard !installed, let delegate = UIApplication.shared.delegate else {
            return
        }
        installed = true
        let delegateClass: AnyClass = type(of: delegate)
        hookDeviceToken(delegateClass)
        hookRemoteNotification(delegateClass)
    }

    private static func hookDeviceToken(_ delegateClass: AnyClass) {
        let selector = #selector(UIApplicationDelegate.application(_:didRegisterForRemoteNotificationsWithDeviceToken:))
        typealias Original = @convention(c) (AnyObject, Selector, UIApplication, Data) -> Void
        var original: IMP?
        let block: @convention(block) (AnyObject, UIApplication, Data) -> Void = { object, application, token in
            if let original = original {
                unsafeBitCast(original, to: Original.self)(object, selector, application, token)
            }
            onDeviceToken?(token)
        }
        let implementation = imp_implementationWithBlock(block)
        if let method = class_getInstanceMethod(delegateClass, selector) {
            original = method_getImplementation(method)
            class_replaceMethod(delegateClass, selector, implementation, method_getTypeEncoding(method))
        } else {
            class_addMethod(delegateClass, selector, implementation, "v@:@@")
        }
    }

    private static func hookRemoteNotification(_ delegateClass: AnyClass) {
        let selector = #selector(UIApplicationDelegate.application(_:didReceiveRemoteNotification:fetchCompletionHandler:))
        typealias Original = @convention(c) (AnyObject, Selector, UIApplication, [AnyHashable: Any], @escaping (UIBackgroundFetchResult) -> Void) -> Void
        var original: IMP?
        let block: @convention(block) (AnyObject, UIApplication, [AnyHashable: Any], @escaping (UIBackgroundFetchResult) -> Void) -> Void = {
            object, application, userInfo, completionHandler in
            onRemoteNotification?(userInfo)
            if let original = original {
                unsafeBitCast(original, to: Original.self)(object, selector, application, userInfo, completionHandler)
            } else {
                completionHandler(.noData)
            }
        }
        let implementation = imp_implementationWithBlock(block)
        if let method = class_getInstanceMethod(delegateClass, selector) {
            original = method_getImplementation(method)
            class_replaceMethod(delegateClass, selector, implementation, method_getTypeEncoding(method))
        } else {
            class_addMethod(delegateClass, selector, implementation, "v@:@@@?")
        }
    }
}
