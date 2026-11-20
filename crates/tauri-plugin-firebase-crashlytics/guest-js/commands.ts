// The Tauri command for each method of @capacitor-firebase/crashlytics's native plugin, in the order of its definitions.ts: the method's name
// in snake_case. Keep in step with build.rs, src/commands.rs and permissions/default.toml (__tests__/apiParity.test.ts
// checks).
export const COMMANDS = {
  crash: 'crash',
  setCustomKey: 'set_custom_key',
  setUserId: 'set_user_id',
  log: 'log',
  setEnabled: 'set_enabled',
  isEnabled: 'is_enabled',
  didCrashOnPreviousExecution: 'did_crash_on_previous_execution',
  sendUnsentReports: 'send_unsent_reports',
  deleteUnsentReports: 'delete_unsent_reports',
  recordException: 'record_exception',
} as const;
