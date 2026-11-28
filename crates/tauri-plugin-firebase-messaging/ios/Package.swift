// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "tauri-plugin-firebase-messaging",
    platforms: [
        .macOS(.v10_15),
        .iOS(.v15),
    ],
    products: [
        .library(name: "tauri-plugin-firebase-messaging", type: .static, targets: ["tauri-plugin-firebase-messaging"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api"),
        // The same Firebase iOS SDK as @capacitor-firebase/messaging 8.6.0
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", .upToNextMajor(from: "12.7.0")),
    ],
    targets: [
        .target(
            name: "tauri-plugin-firebase-messaging",
            dependencies: [
                .byName(name: "Tauri"),
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
            ],
            path: "Sources/tauri-plugin-firebase-messaging"),
    ]
)
