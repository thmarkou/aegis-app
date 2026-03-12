const { withInfoPlist } = require('@expo/config-plugins');

/**
 * Adds microphone permission for APRS audio decoder.
 */
function withMicrophone(config) {
  config = withInfoPlist(config, (c) => {
    c.modResults.NSMicrophoneUsageDescription =
      c.modResults.NSMicrophoneUsageDescription ||
      'AEGIS uses the microphone to decode APRS packets from your radio. Audio is processed locally and not transmitted.';
    return c;
  });
  return config;
}

module.exports = withMicrophone;
