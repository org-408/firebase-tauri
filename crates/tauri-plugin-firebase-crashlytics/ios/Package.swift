// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "tauri-plugin-firebase-crashlytics",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v15),
    ],
    products: [
        .library(name: "tauri-plugin-firebase-crashlytics", type: .static, targets: ["tauri-plugin-firebase-crashlytics"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api"),
        // The same Firebase iOS SDK as @capacitor-firebase/crashlytics 8.6.0
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", .upToNextMajor(from: "12.7.0")),
    ],
    targets: [
        .target(
            name: "tauri-plugin-firebase-crashlytics",
            dependencies: [
                .byName(name: "Tauri"),
                .product(name: "FirebaseCrashlytics", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
            ],
            path: "Sources/tauri-plugin-firebase-crashlytics"),
    ]
)
