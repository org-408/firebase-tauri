// Every method of @capacitor-firebase/analytics, crashlytics and messaging is here, under the same name, on every layer: the
// TypeScript API, the Tauri commands (Rust), the build script's command list (permissions), the default permission,
// the Swift plugin and the Android plugin. The reference is the Capacitor packages in node_modules (exact versions in
// package.json), so a new or removed method upstream fails this test until it is ported.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// @ts-expect-error plain JavaScript helper
import { interfaceMethods, snake } from '../scripts/api.mjs';

const root = join(__dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const readDir = (dir: string, ext: string) =>
  readdirSync(join(root, dir), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(ext))
    .map((f) => read(join(dir, f)))
    .join('\n');
const all = (source: string, pattern: RegExp) => [...source.matchAll(pattern)].map((m) => m[1]!);
const sorted = (names: string[]) => [...names].sort();

/** Methods of the Swift plugin: Tauri calls `<method>:` on it */
const swiftMethods = (dir: string) =>
  all(readDir(dir, '.swift'), /@objc (?:override )?public func (\w+)\(_ invoke: Invoke\)/g);
/** Methods of the Android plugin: Tauri calls the @Command functions */
const javaMethods = (dir: string) => all(readDir(dir, '.java'), /@Command\n\s+public void (\w+)\(Invoke invoke\)/g);
/** (command, method) in src/commands.rs */
const rustCommands = (crate: string) =>
  [...read(`crates/${crate}/src/commands.rs`).matchAll(/^ {2}(\w+) => "(\w+)",$/gm)].map((m) => [m[1]!, m[2]!]);
const buildCommands = (crate: string) => {
  const build = read(`crates/${crate}/build.rs`);
  return all(build.slice(build.indexOf('const COMMANDS')), /"(\w+)",/g);
};
const defaultPermissions = (crate: string) =>
  all(read(`crates/${crate}/permissions/default.toml`), /"allow-([\w-]+)"/g);

/** The plugin interface's event methods: Tauri's `addPluginListener` stands in for them (the two commands below) */
const listenerMethods = ['addListener', 'removeAllListeners'];
const listenerCommands = ['register_listener', 'remove_listener'];
/** What the native plugins are called for the two listener commands (Tauri's own registerListener cannot be replaced on iOS) */
const listenerNativeMethods = ['registerEventListener', 'removeEventListener'];

const packages = [
  { key: 'analytics', Name: 'FirebaseAnalytics', iface: 'FirebaseAnalyticsPlugin', count: 15, listeners: false },
  { key: 'crashlytics', Name: 'FirebaseCrashlytics', iface: 'FirebaseCrashlyticsPlugin', count: 10, listeners: false },
  { key: 'messaging', Name: 'FirebaseMessaging', iface: 'FirebaseMessagingPlugin', count: 18, listeners: true },
] as const;

for (const { key, Name, iface, count, listeners } of packages) {
  const crate = `tauri-plugin-firebase-${key}`;
  const capacitor = `node_modules/@capacitor-firebase/${key}`;

  describe(`${crate} has every method of @capacitor-firebase/${key}`, () => {
    const methods: string[] = interfaceMethods(read(`${capacitor}/dist/esm/definitions.d.ts`), iface);
    // `addListener` has one signature per event: one method. The listener methods are not commands of their own.
    const unique = [...new Set(methods)];
    const natives = unique.filter((m) => !listenerMethods.includes(m));
    const commands: string[] = natives.map(snake);
    const allCommands = listeners ? [...commands, ...listenerCommands] : commands;

    it(`reads the ${count} methods of @capacitor-firebase/${key}`, () => {
      expect(methods).toHaveLength(count);
      expect(unique.length - natives.length).toBe(listeners ? 2 : 0);
    });

    it('keeps definitions.ts as the Capacitor package has it', () => {
      expect(interfaceMethods(read(`crates/${crate}/guest-js/definitions.ts`), iface)).toEqual(methods);
    });

    it('names a Tauri command for each method in the TypeScript API', async () => {
      const { COMMANDS } = await import(/* @vite-ignore */ `../crates/${crate}/guest-js/commands.ts`);
      expect(Object.keys(COMMANDS)).toEqual(natives);
      expect(Object.values(COMMANDS)).toEqual(commands);
    });

    it(`exposes each method on ${Name}`, async () => {
      const mod = await import(/* @vite-ignore */ `../crates/${crate}/guest-js/index.ts`);
      expect(sorted(Object.keys(mod[Name]))).toEqual(sorted(unique));
      for (const method of unique) {
        expect(typeof mod[Name][method]).toBe('function');
      }
    });

    it('has a Rust command for each, calling the native method of the same name', () => {
      expect(rustCommands(crate)).toEqual(natives.map((m, i) => [commands[i], m]));
    });

    it('lists each command for the permissions, and allows every one by default', () => {
      expect(buildCommands(crate)).toEqual(allCommands);
      expect(defaultPermissions(crate)).toEqual(allCommands.map((c) => c.replaceAll('_', '-')));
      for (const command of allCommands) {
        expect(existsSync(join(root, `crates/${crate}/permissions/autogenerated/commands/${command}.toml`))).toBe(true);
      }
    });

    const nativeNames = listeners ? [...natives, ...listenerNativeMethods] : natives;

    it('has a Swift method for each', () => {
      expect(sorted(swiftMethods(`crates/${crate}/ios`))).toEqual(sorted(nativeNames));
    });

    it('exports the Swift entry point the Rust side binds', () => {
      const entry = `init_plugin_firebase_${key}`;
      expect(read(`crates/${crate}/src/mobile.rs`)).toContain(`tauri::ios_plugin_binding!(${entry});`);
      expect(readDir(`crates/${crate}/ios`, '.swift')).toContain(`@_cdecl("${entry}")`);
    });

    it('has an Android method for each', () => {
      expect(sorted(javaMethods(`crates/${crate}/android`))).toEqual(sorted(nativeNames));
    });
  });
}

describe('versions', () => {
  const upstream = (key: string) => JSON.parse(read(`node_modules/@capacitor-firebase/${key}/package.json`)).version;
  const workspace = JSON.parse(read('package.json'));

  it('follows the Capacitor packages exactly (package.json pins them)', () => {
    expect(workspace.devDependencies['@capacitor-firebase/analytics']).toBe(upstream('analytics'));
    expect(workspace.devDependencies['@capacitor-firebase/crashlytics']).toBe(upstream('crashlytics'));
    expect(workspace.devDependencies['@capacitor-firebase/messaging']).toBe(upstream('messaging'));
  });

  it('uses the Firebase SDK versions the Capacitor packages use', () => {
    for (const [key, product, gradle] of [
      ['analytics', 'FirebaseAnalytics', 'firebase-analytics'],
      ['crashlytics', 'FirebaseCrashlytics', 'firebase-crashlytics'],
      ['messaging', 'FirebaseMessaging', 'firebase-messaging'],
    ] as const) {
      const spm = read(`node_modules/@capacitor-firebase/${key}/Package.swift`);
      const spmVersion = /firebase-ios-sdk\.git", \.upToNextMajor\(from: "([\d.]+)"\)/.exec(spm)![1];
      expect(read(`crates/tauri-plugin-firebase-${key}/ios/Package.swift`)).toContain(
        `firebase-ios-sdk.git", .upToNextMajor(from: "${spmVersion}")`,
      );
      expect(product).toBeTruthy();
      const gradleFile = read(`node_modules/@capacitor-firebase/${key}/android/build.gradle`);
      const androidVersion = new RegExp(`'([\\d.]+)'\\n`).exec(
        gradleFile.split('\n').find((l) => l.includes(`firebase${product.replace('Firebase', '')}Version =`))! + '\n',
      )![1];
      expect(read(`crates/tauri-plugin-firebase-${key}/android/build.gradle.kts`)).toContain(
        `com.google.firebase:${gradle}:${androidVersion}`,
      );
    }
  });

  it('keeps the workspace, Cargo and package versions together', () => {
    const cargo = /\[workspace\.package\]\nversion = "([\d.]+)"/.exec(read('Cargo.toml'))![1];
    expect(workspace.version).toBe(cargo);
    for (const key of ['analytics', 'crashlytics', 'messaging']) {
      expect(JSON.parse(read(`crates/tauri-plugin-firebase-${key}/package.json`)).version).toBe(cargo);
    }
  });
});
