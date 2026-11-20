// The Tauri command for each method of @capacitor-firebase/analytics's native plugin, in the order of its definitions.ts: the method's name
// in snake_case. Keep in step with build.rs, src/commands.rs and permissions/default.toml (__tests__/apiParity.test.ts
// checks).
export const COMMANDS = {
  getAppInstanceId: 'get_app_instance_id',
  setConsent: 'set_consent',
  setUserId: 'set_user_id',
  setUserProperty: 'set_user_property',
  setCurrentScreen: 'set_current_screen',
  logEvent: 'log_event',
  setSessionTimeoutDuration: 'set_session_timeout_duration',
  setEnabled: 'set_enabled',
  isEnabled: 'is_enabled',
  resetAnalyticsData: 'reset_analytics_data',
  logTransaction: 'log_transaction',
  initiateOnDeviceConversionMeasurementWithEmailAddress: 'initiate_on_device_conversion_measurement_with_email_address',
  initiateOnDeviceConversionMeasurementWithPhoneNumber: 'initiate_on_device_conversion_measurement_with_phone_number',
  initiateOnDeviceConversionMeasurementWithHashedEmailAddress:
    'initiate_on_device_conversion_measurement_with_hashed_email_address',
  initiateOnDeviceConversionMeasurementWithHashedPhoneNumber:
    'initiate_on_device_conversion_measurement_with_hashed_phone_number',
} as const;
