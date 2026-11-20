# Workflow (branches, PRs, versions)

This repository follows the org-408 conventions (`org-408/purchases-tauri`, `org-408/tauri-ai-cli`). Only what is specific
here is written down.

## 1. Branches and pull requests

- `develop` is the integration branch (the default). Work on `feature/T<n>-<description>` branched from `develop`, and
  open a PR to `develop`. One task = one branch = one PR. `T<n>` is the GitHub issue number.
- Merge with a merge commit (`gh pr merge <n> --merge`).
- There is no `main`. A release is a tag `v<version>`.
- The PR body follows [`.github/pull_request_template.md`](../.github/pull_request_template.md). Write it in English: this
  is a public repository.
- Commit messages: Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`).

## 2. Versions

- `vX.Y.Z`; `v0.x.y` until the API is considered stable. Breaking changes bump x, fixes and additions bump y.
- One version for everything: `Cargo.toml` (`workspace.package.version`), the root `package.json`, and the two
  `crates/*/package.json`. The `apiParity` test checks they agree.
- When a change that raises the version reaches `develop`, `.github/workflows/auto-tag.yml` tags the merge commit
  `v<version>` (annotated).

## 3. Publishing (not done yet)

- Names (free on 2026-11-20): crates.io `tauri-plugin-firebase-analytics`, `tauri-plugin-firebase-crashlytics`; npm
  `tauri-plugin-firebase-analytics-api`, `tauri-plugin-firebase-crashlytics-api` (the official-plugin naming scheme, without
  claiming to be official).
- To publish: remove `publish = false` in `Cargo.toml`, then `cargo publish -p <crate>` and `npm publish -w <package>`.
  Do this only after the maintainers confirm.

## 4. Using it from an app

[README](../README.md#install). `dist-js/` is committed so a git dependency works; CI fails if it is stale.

## 5. Verification (before merging)

- `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`, `cargo test --workspace`
- `npm run verify` (format, build, types, tests including `apiParity`)
- Swift or Java changed: `cargo check --workspace --target aarch64-apple-ios-sim`, and for Android
  `cargo check --workspace --target aarch64-linux-android` then `gradle -p crates/<crate>/android compileDebugJavaWithJavac`
- Behaviour changed: run `examples/firebase-tester` on an iOS simulator and an Android emulator with a Firebase **test**
  project (never a production project).

## 6. Following upstream

Upstream is `capawesome-team/capacitor-firebase`; the ported packages are `@capacitor-firebase/analytics` and
`@capacitor-firebase/crashlytics`, pinned exactly in the root `package.json`.

1. `.github/workflows/follow-upstream.yml` (daily, or by hand) runs `scripts/sync-upstream.mjs`. When a release is newer
   it opens a PR that moves the pins and the Firebase iOS and Android SDK versions (read from the new release's
   `Package.swift` and `build.gradle`), puts the upstream source diff in the PR body, and starts CI with
   `gh workflow run ci.yml --ref <branch>`. A PR opened with `GITHUB_TOKEN` does not trigger CI by itself, but a
   `workflow_dispatch` run does, and its checks show on the PR.
2. If a method was added or removed upstream, `apiParity` fails. Port it: copy `definitions.ts`, add the command on every
   layer (`build.rs`, `src/commands.rs`, `guest-js/commands.ts`, `permissions/default.toml`, Swift, Java), then bump the
   version.
3. If only native code changed, apply the same diff to the Swift and Java here (the files are derived from upstream with
   only the Capacitor classes replaced; `docs/TECH-NOTES.md` §1 lists them).
4. Run `node scripts/sync-upstream.mjs --check` by hand to see what is pending.
