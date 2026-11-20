// Derived from @capacitor-firebase/crashlytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import WebKit
import Tauri

// @capacitor-firebase/crashlytics: ios/Plugin/FirebaseCrashlyticsPlugin.swift
//
// The same plugin on Tauri: Capacitor's call is Tauri's `Invoke` wrapped in `PluginCall` (PluginCall.swift). Everything
// else is the Capacitor plugin's.
@objc(FirebaseCrashlyticsPlugin)
public class FirebaseCrashlyticsPlugin: Plugin {
    public let errorMessageMissing = "message must be provided."
    public let errorKeyMissing = "key must be provided."
    public let errorValueMissing = "value must be provided."
    public let errorUserIdMissing = "userId must be provided."
    public let errorEnabledMissing = "enabled must be provided."
    private var implementation: FirebaseCrashlytics?

    override public func load(webview: WKWebView) {
        implementation = FirebaseCrashlytics()
    }

    @objc public func crash(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let message = call.getString("message") else {
            call.reject(errorMessageMissing)
            return
        }
        call.resolve()
        implementation?.crash(message)
    }

    @objc public func setCustomKey(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let key = call.getString("key") else {
            call.reject(errorKeyMissing)
            return
        }
        let hasValue = call.hasOption("value")
        if hasValue == false {
            call.reject(errorValueMissing)
            return
        }
        let type = call.getString("type") ?? "string"
        implementation?.setCustomKey(key, type, call)
        call.resolve()
    }

    @objc public func log(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let message = call.getString("message") else {
            call.reject(errorMessageMissing)
            return
        }
        implementation?.log(message)
        call.resolve()
    }

    @objc public func setUserId(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let userId = call.getString("userId") else {
            call.reject(errorUserIdMissing)
            return
        }
        implementation?.setUserID(userId)
        call.resolve()
    }

    @objc public func setEnabled(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let enabled = call.getBool("enabled") else {
            call.reject(errorEnabledMissing)
            return
        }
        implementation?.setEnabled(enabled)
        call.resolve()
    }

    @objc public func isEnabled(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let enabled = implementation?.isEnabled()
        call.resolve([
            "enabled": enabled!
        ])
    }

    @objc public func didCrashOnPreviousExecution(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let crashed = implementation?.didCrashOnPreviousExecution()
        call.resolve([
            "crashed": crashed!
        ])
    }

    @objc public func sendUnsentReports(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.sendUnsentReports()
        call.resolve()
    }

    @objc public func deleteUnsentReports(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.deleteUnsentReports()
        call.resolve()
    }

    @objc public func recordException(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let message = call.getString("message") else {
            call.reject(errorMessageMissing)
            return
        }

        let stacktrace = call.getArray("stacktrace", JSObject.self)
        let keysAndValues = call.getArray("keysAndValues", JSObject.self)

        if stacktrace == nil || stacktrace!.isEmpty {
            let domain = call.getString("domain") ?? ""
            let code = call.getInt("code") ?? -1001

            if keysAndValues == nil || keysAndValues!.isEmpty {
                implementation?.recordException(message, domain, code)
            } else {
                implementation?.recordException(message, domain, code, keysAndValues!)
            }
        } else {
            implementation?.recordExceptionWithStacktrace(message, stacktrace!)
        }
        call.resolve()
    }
}

@_cdecl("init_plugin_firebase_crashlytics")
public func initPlugin() -> Plugin {
    return FirebaseCrashlyticsPlugin()
}
