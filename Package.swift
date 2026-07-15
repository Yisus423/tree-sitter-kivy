// swift-tools-version:5.3
import PackageDescription

let package = Package(
    name: "TreeSitterKivy",
    products: [
        .library(name: "TreeSitterKivy", targets: ["TreeSitterKivy"]),
    ],
    dependencies: [
        .package(url: "https://github.com/ChimeHQ/SwiftTreeSitter", from: "0.8.0"),
    ],
    targets: [
        .target(
            name: "TreeSitterKivy",
            dependencies: [],
            path: ".",
            sources: [
                "src/parser.c",
                "src/scanner.c",
            ],
            resources: [
                .copy("queries")
            ],
            publicHeadersPath: "bindings/swift",
            cSettings: [.headerSearchPath("src")]
        ),
        .testTarget(
            name: "TreeSitterKivyTests",
            dependencies: [
                "SwiftTreeSitter",
                "TreeSitterKivy",
            ],
            path: "bindings/swift/TreeSitterKivyTests"
        )
    ],
    cLanguageStandard: .c11
)
