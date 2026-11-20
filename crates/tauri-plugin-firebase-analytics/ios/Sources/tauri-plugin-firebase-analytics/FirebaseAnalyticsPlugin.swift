// Derived from @capacitor-firebase/analytics 8.6.0 (Apache-2.0, Copyright Robin Genz and the Capawesome contributors),
// modified for Tauri 2 (see NOTICE).
import Foundation
import WebKit
import Tauri

import FirebaseCore

// @capacitor-firebase/analytics: ios/Plugin/FirebaseAnalyticsPlugin.swift
//
// The same plugin on Tauri: Capacitor's call is Tauri's `Invoke` wrapped in `PluginCall` (PluginCall.swift). Everything
// else is the Capacitor plugin's.
@objc(FirebaseAnalyticsPlugin)
public class FirebaseAnalyticsPlugin: Plugin {
    public let errorUserIdMissing = "userId must be provided."
    public let errorKeyMissing = "key must be provided."
    public let errorValueMissing = "value must be provided."
    public let errorNameMissing = "name must be provided."
    public let errorEnabledMissing = "enabled must be provided."
    public let errorConsentTypeMissing = "consentType must be provided."
    public let errorConsentStatusMissing = "consentStatus must be provided."
    public let errorTransactionIdMissing = "transactionId must be provided."
    public let errorInvalidTransactionId = "transactionId is not a valid numeric identifier."
    public let errorTransactionNotFound = "Transaction not found."
    public let errorEmailAddressMissing = "emailAddress must be provided."
    public let errorInvalidEmailFormat = "Invalid email format. Please provide a valid email address."
    public let errorPhoneNumberMissing = "phoneNumber must be provided."
    public let errorEmailAddressToHashMissing = "emailAddressToHash must be provided."
    public let errorPhoneNumberToHashMissing = "phoneNumberToHash must be provided."
    public let errorInvalidPhoneNumberFormat = "Invalid phone number format. Please provide a valid E.164 formatted phone number."
    private var implementation: FirebaseAnalytics?

    override public func load(webview: WKWebView) {
        implementation = FirebaseAnalytics(plugin: self)
    }

    @objc public func getAppInstanceId(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let appInstanceId = implementation?.getAppInstanceId()
        var result = JSObject()
        if appInstanceId != nil {
            result["appInstanceId"] = appInstanceId
        }
        call.resolve(result)
    }

    @objc public func setConsent(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let consentType = FirebaseAnalyticsHelper.mapStringToConsentType(call.getString("type")) else {
            call.reject(errorConsentTypeMissing)
            return
        }
        guard let consentStatus = FirebaseAnalyticsHelper.mapStringToConsentStatus(call.getString("status")) else {
            call.reject(errorConsentStatusMissing)
            return
        }
        implementation?.setConsent(consentType: consentType, consentStatus: consentStatus)
        call.resolve()
    }

    @objc public func setUserId(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let userId = call.getString("userId")
        implementation?.setUserId(userId)
        call.resolve()
    }

    @objc public func setUserProperty(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let key = call.getString("key") else {
            call.reject(errorKeyMissing)
            return
        }
        let value = call.getString("value")
        implementation?.setUserProperty(key, value)
        call.resolve()
    }

    @objc public func setCurrentScreen(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let screenName = call.getString("screenName")
        let screenClass = call.getString("screenClassOverride")
        implementation?.setCurrentScreen(screenName, screenClass)
        call.resolve()
    }

    @objc public func logEvent(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let name = call.getString("name") else {
            call.reject(errorNameMissing)
            return
        }
        let params = call.getObject("params")
        implementation?.logEvent(name, params)
        call.resolve()
    }

    @objc public func setSessionTimeoutDuration(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        let duration = call.getInt("duration") ?? 1800
        implementation?.setSessionTimeoutDuration(duration)
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
        call.unimplemented("Not implemented on iOS.")
    }

    @objc public func resetAnalyticsData(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        implementation?.resetAnalyticsData()
        call.resolve()
    }

    @objc public func logTransaction(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let transactionId = call.getString("transactionId") else {
            call.reject(errorTransactionIdMissing)
            return
        }
        guard let transactionIdUInt64 = UInt64(transactionId) else {
            call.reject(errorInvalidTransactionId)
            return
        }
        if #available(iOS 15.0, *) {
            implementation?.logTransaction(transactionId: transactionIdUInt64) { errorMessage in
                if let errorMessage = errorMessage {
                    call.reject(errorMessage)
                } else {
                    call.resolve()
                }
            }
        } else {
            call.unavailable("Not available on iOS < 15.0.")
        }
    }

    @objc public func initiateOnDeviceConversionMeasurementWithEmailAddress(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let emailAddress = call.getString("emailAddress") else {
            call.reject(errorEmailAddressMissing)
            return
        }
        if !FirebaseAnalyticsHelper.isValidEmail(emailAddress) {
            call.reject(errorInvalidEmailFormat)
            return
        }
        implementation?.initiateOnDeviceConversionMeasurement(email: emailAddress)
        call.resolve()
    }

    @objc public func initiateOnDeviceConversionMeasurementWithPhoneNumber(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let phoneNumber = call.getString("phoneNumber") else {
            call.reject(errorPhoneNumberMissing)
            return
        }
        if !FirebaseAnalyticsHelper.isValidE164PhoneNumber(phoneNumber) {
            call.reject(errorInvalidPhoneNumberFormat)
            return
        }
        implementation?.initiateOnDeviceConversionMeasurement(phone: phoneNumber)
        call.resolve()
    }

    @objc public func initiateOnDeviceConversionMeasurementWithHashedEmailAddress(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let email = call.getString("emailAddressToHash") else {
            call.reject(errorEmailAddressToHashMissing)
            return
        }
        if !FirebaseAnalyticsHelper.isValidEmail(email) {
            call.reject(errorInvalidEmailFormat)
            return
        }
        let normalizedEmail = FirebaseAnalyticsHelper.normalizeEmail(email)
        let hashedEmail = FirebaseAnalyticsHelper.sha256(normalizedEmail)
        implementation?.initiateOnDeviceConversionMeasurement(hashedEmail: hashedEmail)
        call.resolve()
    }

    @objc public func initiateOnDeviceConversionMeasurementWithHashedPhoneNumber(_ invoke: Invoke) {
        let call = PluginCall(invoke)
        guard let phone = call.getString("phoneNumberToHash") else {
            call.reject(errorPhoneNumberToHashMissing)
            return
        }
        if !FirebaseAnalyticsHelper.isValidE164PhoneNumber(phone) {
            call.reject(errorInvalidPhoneNumberFormat)
            return
        }
        let hashedPhone = FirebaseAnalyticsHelper.sha256(phone)
        implementation?.initiateOnDeviceConversionMeasurement(hashedPhone: hashedPhone)
        call.resolve()
    }
}

@_cdecl("init_plugin_firebase_analytics")
public func initPlugin() -> Plugin {
    return FirebaseAnalyticsPlugin()
}
