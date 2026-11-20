#!/usr/bin/env node
// Follows the Capacitor packages this repository ports (docs/WORKFLOW.md §6).
//
//   node scripts/sync-upstream.mjs            bump to the latest releases and sync the Firebase SDK versions
//   node scripts/sync-upstream.mjs --check    only say what would change (exit 0 either way)
//
// What it moves, per package (analytics, crashlytics):
//   - the exact `@capacitor-firebase/<name>` version in the root package.json (the reference apiParity tests against)
//   - the Firebase iOS SDK version in ios/Package.swift and the Firebase Android SDK version in android/build.gradle.kts,
//     read from the new upstream release, so the native SDKs are the ones the Capacitor plugin uses
// It prints a markdown summary (for a pull request body) on stdout, including the upstream's native and TypeScript
// source diff between the two releases, which the Swift, Java and TypeScript code here must follow.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { interfaceMethods } from './api.mjs';

const root = new URL('..', import.meta.url).pathname;
const check = process.argv.includes('--check');
const read = (p) => readFileSync(join(root, p), 'utf8');
const write = (p, s) => writeFileSync(join(root, p), s);
const sh = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();

const packages = [
  {
    key: 'analytics',
    iface: 'FirebaseAnalyticsPlugin',
    gradle: 'firebaseAnalyticsVersion',
    artifact: 'firebase-analytics',
  },
  {
    key: 'crashlytics',
    iface: 'FirebaseCrashlyticsPlugin',
    gradle: 'firebaseCrashlyticsVersion',
    artifact: 'firebase-crashlytics',
  },
];

const semver = (v) => v.split('.').map(Number);
const newer = (a, b) => {
  const [x, y] = [semver(a), semver(b)];
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
  return false;
};

/** Unpacks an upstream release into a fresh directory */
function unpack(name, version) {
  const dir = mkdtempSync(join(tmpdir(), 'upstream-'));
  const tgz = sh('npm', ['pack', `${name}@${version}`, '--pack-destination', dir, '--silent']);
  sh('tar', ['-xzf', join(dir, tgz), '-C', dir]);
  return join(dir, 'package');
}

const workspace = JSON.parse(read('package.json'));
const summary = [];
let apiChanged = false;
let changed = false;

for (const p of packages) {
  const name = `@capacitor-firebase/${p.key}`;
  const current = workspace.devDependencies[name];
  const latest = sh('npm', ['view', name, 'version']);
  const crate = `crates/tauri-plugin-firebase-${p.key}`;

  // Firebase SDK versions of the release we are on or moving to
  const target = newer(latest, current) ? latest : current;
  const upstream = unpack(name, target);
  const swift = /firebase-ios-sdk\.git", \.upToNextMajor\(from: "([\d.]+)"\)/.exec(
    readFileSync(join(upstream, 'Package.swift'), 'utf8'),
  )?.[1];
  const gradleLine = readFileSync(join(upstream, 'android/build.gradle'), 'utf8')
    .split('\n')
    .find((l) => l.includes(`${p.gradle} =`));
  const android = /: '([\d.]+)'/.exec(gradleLine ?? '')?.[1];
  if (!swift || !android) throw new Error(`cannot read the Firebase SDK versions of ${name}@${target}`);

  const swiftFile = `${crate}/ios/Package.swift`;
  const gradleFile = `${crate}/android/build.gradle.kts`;
  const swiftNow = /firebase-ios-sdk\.git", \.upToNextMajor\(from: "([\d.]+)"\)/.exec(read(swiftFile))[1];
  const androidNow = new RegExp(`com\\.google\\.firebase:${p.artifact}:([\\d.]+)`).exec(read(gradleFile))[1];
  if (swiftNow !== swift) {
    summary.push(`- ${p.key}: Firebase iOS SDK ${swiftNow} → ${swift}`);
    changed = true;
    if (!check) write(swiftFile, read(swiftFile).replace(`from: "${swiftNow}"`, `from: "${swift}"`));
  }
  if (androidNow !== android) {
    summary.push(`- ${p.key}: Firebase Android SDK ${androidNow} → ${android}`);
    changed = true;
    if (!check) write(gradleFile, read(gradleFile).replace(`${p.artifact}:${androidNow}`, `${p.artifact}:${android}`));
  }

  if (newer(latest, current)) {
    changed = true;
    summary.push(`- ${name}: ${current} → ${latest}`);
    const before = unpack(name, current);
    const defs = (dir) => interfaceMethods(readFileSync(join(dir, 'dist/esm/definitions.d.ts'), 'utf8'), p.iface);
    const [a, b] = [defs(before), defs(upstream)];
    const added = b.filter((m) => !a.includes(m));
    const removed = a.filter((m) => !b.includes(m));
    if (added.length || removed.length) {
      apiChanged = true;
      summary.push(
        `  - **API changed**: added ${added.join(', ') || 'none'}; removed ${removed.join(', ') || 'none'}. apiParity fails until they are ported.`,
      );
    }
    // The sources the Swift, Java and TypeScript here are ported from
    let diff = '';
    for (const dir of ['ios/Plugin', 'android/src/main', 'dist/esm']) {
      try {
        sh('diff', ['-ru', join(before, dir), join(upstream, dir)]);
      } catch (e) {
        diff += e.stdout ?? '';
      }
    }
    summary.push(
      diff
        ? `\n<details><summary>Upstream source diff, ${name} ${current} → ${latest}</summary>\n\n\`\`\`diff\n${diff.slice(0, 20000)}\n\`\`\`\n</details>\n`
        : '  - no native or TypeScript source change',
    );
    if (!check) workspace.devDependencies[name] = latest;
  }
}

if (changed && !check) {
  write('package.json', JSON.stringify(workspace, null, 2) + '\n');
}

console.log(changed ? summary.join('\n') : 'up to date');
// For the workflow: whether anything moved, and whether the API did
if (process.env.GITHUB_OUTPUT) {
  const out = `changed=${changed}\napi_changed=${apiChanged}\n`;
  writeFileSync(process.env.GITHUB_OUTPUT, out, { flag: 'a' });
}
