// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "tauri-plugin-firebase-analytics",
    platforms: [
        .iOS(.v15),
    ],
    products: [
        .library(name: "tauri-plugin-firebase-analytics", type: .static, targets: ["tauri-plugin-firebase-analytics"]),
    ],
    dependencies: [
        .package(name: "Tauri", path: "../.tauri/tauri-api"),
        // The same Firebase iOS SDK as @capacitor-firebase/analytics 8.6.0. FirebaseAnalytics includes IDFA support, as the
        // Capacitor plugin's default does (docs/TECH-NOTES.md, "Advertising ID").
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", .upToNextMajor(from: "12.7.0")),
    ],
    targets: [
        .target(
            name: "tauri-plugin-firebase-analytics",
            dependencies: [
                .byName(name: "Tauri"),
                .product(name: "FirebaseAnalytics", package: "firebase-ios-sdk"),
                .product(name: "FirebaseCore", package: "firebase-ios-sdk"),
            ],
            path: "Sources/tauri-plugin-firebase-analytics"),
    ]
)
