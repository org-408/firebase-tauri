import Foundation
import Tauri

/// Capacitor's `JSObject`: a JSON object
typealias JSObject = [String: Any]

/// The @capacitor-firebase plugins are written against Capacitor's `CAPPluginCall`. This is the part of that surface
/// they use, on Tauri's `Invoke`, so the plugins' code stays theirs.
///
/// The arguments are the object the page sent (what `CAPPluginCall.options` holds). `reject` sends a message and
/// optionally a code (`UNIMPLEMENTED`, `UNAVAILABLE`); the page gets `{ code, message }`, what Capacitor rejects with.
final class PluginCall {
    let invoke: Invoke
    let options: [String: Any]

    init(_ invoke: Invoke) {
        self.invoke = invoke
        self.options = PluginCall.parse(invoke.getRawArgs())
    }

    static func parse(_ rawArgs: String) -> [String: Any] {
        let data = Data(rawArgs.utf8)
        return ((try? JSONSerialization.jsonObject(with: data)) as? [String: Any]) ?? [:]
    }

    func hasOption(_ key: String) -> Bool {
        return options[key] != nil && !(options[key] is NSNull)
    }

    func getString(_ key: String) -> String? {
        return options[key] as? String
    }

    func getBool(_ key: String) -> Bool? {
        return options[key] as? Bool
    }

    func getInt(_ key: String) -> Int? {
        return options[key] as? Int
    }

    func getFloat(_ key: String) -> Float? {
        return (options[key] as? NSNumber)?.floatValue
    }

    func getDouble(_ key: String) -> Double? {
        return (options[key] as? NSNumber)?.doubleValue
    }

    func getObject(_ key: String) -> [String: Any]? {
        return options[key] as? [String: Any]
    }

    func getArray<T>(_ key: String, _ type: T.Type) -> [T]? {
        return (options[key] as? [Any])?.compactMap { $0 as? T }
    }

    func resolve() {
        invoke.resolve()
    }

    func resolve(_ data: [String: Any]) {
        invoke.resolve(data.mapValues { Optional($0) })
    }

    func reject(_ message: String, _ code: String? = nil) {
        invoke.reject(message, code: code)
    }

    func unimplemented(_ message: String = "not implemented") {
        reject(message, "UNIMPLEMENTED")
    }

    func unavailable(_ message: String = "not available") {
        reject(message, "UNAVAILABLE")
    }
}
