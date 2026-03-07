const { withEntitlementsPlist } = require('@expo/config-plugins');

/**
 * Removes the Push Notifications (aps-environment) entitlement.
 * Personal Team (free Apple account) does not support Push Notifications.
 * Local notifications (scheduleNotificationAsync) still work without this.
 */
function withoutPushForPersonalTeam(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
}

module.exports = withoutPushForPersonalTeam;
