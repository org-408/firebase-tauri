// Calls the plugins on the device and writes a report (the app's data folder and, on Android, logcat).
//
// Two kinds of checks. "plugin" checks need no Firebase project: argument validation and `UNIMPLEMENTED` answers come
// from the plugin's own code. "firebase" checks call the Firebase SDK and need the app configured with a Firebase TEST
// project (GoogleService-Info.plist / google-services.json; README). Without it, the firebase checks are skipped.
import { invoke } from '@tauri-apps/api/core';
import { ConsentStatus, ConsentType, FirebaseAnalytics } from 'tauri-plugin-firebase-analytics-api';
import { FirebaseCrashlytics } from 'tauri-plugin-firebase-crashlytics-api';

type Result = { name: string; kind: 'plugin' | 'firebase'; ok: boolean; detail?: unknown };
const results: Result[] = [];
const params = new URLSearchParams(location.search);
const withFirebase = params.get('firebase') === '1' || localStorage.getItem('firebase') === '1';

async function check(name: string, kind: Result['kind'], run: () => Promise<unknown>, expectError?: string) {
  if (kind === 'firebase' && !withFirebase) {
    results.push({ name, kind, ok: true, detail: 'skipped (no Firebase test project)' });
    return;
  }
  try {
    const value = await run();
    results.push({ name, kind, ok: expectError === undefined, detail: value ?? null });
  } catch (e) {
    const err = e as { message?: string; code?: string };
    const ok = expectError !== undefined && (err.message === expectError || err.code === expectError);
    results.push({ name, kind, ok, detail: { message: err.message, code: err.code } });
  }
}

async function runAll() {
  const platform = (globalThis as any).__TAURI_FIREBASE_ANALYTICS__?.platform;
  // plugin checks
  await check(
    'analytics.logEvent without name',
    'plugin',
    () => FirebaseAnalytics.logEvent({} as any),
    'name must be provided.',
  );
  await check(
    'analytics.setEnabled without enabled',
    'plugin',
    () => FirebaseAnalytics.setEnabled({} as any),
    'enabled must be provided.',
  );
  await check(
    'analytics.setUserProperty without key',
    'plugin',
    () => FirebaseAnalytics.setUserProperty({} as any),
    'key must be provided.',
  );
  await check(
    'analytics.isEnabled is not implemented natively',
    'plugin',
    () => FirebaseAnalytics.isEnabled(),
    'UNIMPLEMENTED',
  );
  await check(
    'crashlytics.log without message',
    'plugin',
    () => FirebaseCrashlytics.log({} as any),
    'message must be provided.',
  );
  await check(
    'crashlytics.setUserId without userId',
    'plugin',
    () => FirebaseCrashlytics.setUserId({} as any),
    'userId must be provided.',
  );
  await check(
    'crashlytics.setCustomKey without value',
    'plugin',
    () => FirebaseCrashlytics.setCustomKey({ key: 'k' } as any),
    'value must be provided.',
  );
  // firebase checks
  await check('analytics.getAppInstanceId', 'firebase', () => FirebaseAnalytics.getAppInstanceId());
  await check('analytics.setEnabled', 'firebase', () => FirebaseAnalytics.setEnabled({ enabled: true }));
  await check('analytics.setUserId', 'firebase', () => FirebaseAnalytics.setUserId({ userId: 'firebase-tester' }));
  await check('analytics.setUserProperty', 'firebase', () =>
    FirebaseAnalytics.setUserProperty({ key: 'tester', value: '1' }),
  );
  await check('analytics.setConsent', 'firebase', () =>
    FirebaseAnalytics.setConsent({ type: ConsentType.AnalyticsStorage, status: ConsentStatus.Granted }),
  );
  await check('analytics.setCurrentScreen', 'firebase', () =>
    FirebaseAnalytics.setCurrentScreen({ screenName: 'Tester', screenClassOverride: 'TesterView' }),
  );
  await check('analytics.logEvent', 'firebase', () =>
    FirebaseAnalytics.logEvent({ name: 'tester_event', params: { n: 1, s: 'x', b: true } }),
  );
  await check('analytics.setSessionTimeoutDuration', 'firebase', () =>
    FirebaseAnalytics.setSessionTimeoutDuration({ duration: 1800 }),
  );
  await check('analytics.resetAnalyticsData', 'firebase', () => FirebaseAnalytics.resetAnalyticsData());
  await check('crashlytics.setEnabled', 'firebase', () => FirebaseCrashlytics.setEnabled({ enabled: true }));
  await check('crashlytics.isEnabled', 'firebase', () =>
    platform === 'android' ? Promise.resolve('n/a on Android') : FirebaseCrashlytics.isEnabled(),
  );
  await check('crashlytics.setUserId', 'firebase', () => FirebaseCrashlytics.setUserId({ userId: 'firebase-tester' }));
  await check('crashlytics.setCustomKey', 'firebase', () =>
    FirebaseCrashlytics.setCustomKey({ key: 'k', value: 'v', type: 'string' }),
  );
  await check('crashlytics.log', 'firebase', () => FirebaseCrashlytics.log({ message: 'tester log' }));
  await check('crashlytics.recordException', 'firebase', () =>
    FirebaseCrashlytics.recordException({ message: 'tester exception' }),
  );
  await check('crashlytics.didCrashOnPreviousExecution', 'firebase', () =>
    FirebaseCrashlytics.didCrashOnPreviousExecution(),
  );
  await check('crashlytics.sendUnsentReports', 'firebase', () => FirebaseCrashlytics.sendUnsentReports());
  await check('crashlytics.deleteUnsentReports', 'firebase', () => FirebaseCrashlytics.deleteUnsentReports());

  const failed = results.filter((r) => !r.ok);
  const summary = `${platform}: ${results.length - failed.length}/${results.length} ok${failed.length ? ', FAILED: ' + failed.map((f) => f.name).join('; ') : ''}`;
  document.getElementById('summary')!.textContent = summary;
  document.getElementById('log')!.textContent = JSON.stringify(results, null, 2);
  await invoke('save_report', { report: JSON.stringify({ platform, withFirebase, summary, results }, null, 2) });
}

// Crash buttons: a native crash (Crashlytics reports it on the next launch) and a JavaScript error
const buttons = document.getElementById('buttons')!;
const addButton = (label: string, run: () => Promise<unknown>) => {
  const b = document.createElement('button');
  b.textContent = label;
  b.onclick = () => run().catch((e) => (document.getElementById('log')!.textContent = String(e?.message ?? e)));
  buttons.append(b);
};
addButton('Crash (native)', () => FirebaseCrashlytics.crash({ message: 'tester crash' }));
addButton('Did crash before?', async () => {
  document.getElementById('log')!.textContent = JSON.stringify(await FirebaseCrashlytics.didCrashOnPreviousExecution());
});
addButton('Use Firebase', async () => {
  localStorage.setItem('firebase', '1');
  location.reload();
});

runAll().catch((e) => (document.getElementById('summary')!.textContent = 'error: ' + (e?.message ?? e)));
