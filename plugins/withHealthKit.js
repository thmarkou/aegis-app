const { withInfoPlist, withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Adds HealthKit support for react-native-health.
 * Required: NSHealthShareUsageDescription, NSHealthUpdateUsageDescription, HealthKit entitlement.
 */
function withHealthKit(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.NSHealthShareUsageDescription =
      c.modResults.NSHealthShareUsageDescription ||
      'AEGIS reads heart rate, blood oxygen (SpO2), resting heart rate, active energy, steps, and distance from Apple Health for the tactical dashboard and APRS status messages.';
    c.modResults.NSHealthUpdateUsageDescription =
      c.modResults.NSHealthUpdateUsageDescription ||
      'AEGIS may save activity data to Apple Health.';
    return c;
  });
  config = withEntitlementsPlist(config, (c) => {
    // Basic HealthKit only. Do NOT add com.apple.developer.healthkit.access –
    // that's for Verifiable Health Records and requires Apple approval (not supported by Personal Team).
    c.modResults['com.apple.developer.healthkit'] = true;
    return c;
  });
  return config;
}

module.exports = withHealthKit;
