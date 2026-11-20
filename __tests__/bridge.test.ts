// What the page sees: calls go to the plugin's Tauri commands with the options as passed, "nothing" is undefined,
// and a rejection is an Error carrying the Capacitor-style code.
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke }));

type G = typeof globalThis & Record<string, unknown>;
const setPlatform = (name: string, platform: string) => {
  (globalThis as G)[name] = { platform };
};

describe('FirebaseAnalytics', () => {
  beforeEach(() => {
    invoke.mockReset();
    setPlatform('__TAURI_FIREBASE_ANALYTICS__', 'ios');
  });

  it('calls the command with the options as passed', async () => {
    invoke.mockResolvedValue(null);
    const { FirebaseAnalytics } = await import('../crates/tauri-plugin-firebase-analytics/guest-js/index');
    const result = await FirebaseAnalytics.logEvent({ name: 'select_content', params: { id: 1 } });
    expect(invoke).toHaveBeenCalledWith('plugin:firebase-analytics|log_event', {
      name: 'select_content',
      params: { id: 1 },
    });
    expect(result).toBeUndefined();
  });

  it('returns what the plugin returns', async () => {
    invoke.mockResolvedValue({ appInstanceId: 'abc' });
    const { FirebaseAnalytics } = await import('../crates/tauri-plugin-firebase-analytics/guest-js/index');
    expect(await FirebaseAnalytics.getAppInstanceId()).toEqual({ appInstanceId: 'abc' });
  });

  it('rejects with the code and message the plugin sent', async () => {
    invoke.mockRejectedValue({ code: 'UNIMPLEMENTED', message: 'Not implemented on iOS.' });
    const { FirebaseAnalytics } = await import('../crates/tauri-plugin-firebase-analytics/guest-js/index');
    await expect(FirebaseAnalytics.isEnabled()).rejects.toMatchObject({
      message: 'Not implemented on iOS.',
      code: 'UNIMPLEMENTED',
    });
    await expect(FirebaseAnalytics.isEnabled()).rejects.toBeInstanceOf(Error);
  });

  it('does not call the native plugin off iOS and Android', async () => {
    setPlatform('__TAURI_FIREBASE_ANALYTICS__', 'desktop');
    const { FirebaseAnalytics } = await import('../crates/tauri-plugin-firebase-analytics/guest-js/index');
    await expect(FirebaseAnalytics.resetAnalyticsData()).rejects.toMatchObject({ code: 'UNIMPLEMENTED' });
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('FirebaseCrashlytics', () => {
  beforeEach(() => {
    invoke.mockReset();
    setPlatform('__TAURI_FIREBASE_CRASHLYTICS__', 'android');
  });

  it('calls the command and resolves undefined for "nothing"', async () => {
    invoke.mockResolvedValue(null);
    const { FirebaseCrashlytics } = await import('../crates/tauri-plugin-firebase-crashlytics/guest-js/index');
    expect(await FirebaseCrashlytics.setCustomKey({ key: 'k', value: 1, type: 'int' })).toBeUndefined();
    expect(invoke).toHaveBeenCalledWith('plugin:firebase-crashlytics|set_custom_key', {
      key: 'k',
      value: 1,
      type: 'int',
    });
  });

  it('answers on the web as the Capacitor package does', async () => {
    setPlatform('__TAURI_FIREBASE_CRASHLYTICS__', 'desktop');
    const { FirebaseCrashlytics } = await import('../crates/tauri-plugin-firebase-crashlytics/guest-js/index');
    await expect(FirebaseCrashlytics.crash({ message: 'x' })).rejects.toMatchObject({
      message: 'Not implemented on web.',
      code: 'UNIMPLEMENTED',
    });
  });
});
