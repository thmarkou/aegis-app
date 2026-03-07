const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// NativeWind disabled - causes expo start to hang on this project.
// App uses StyleSheet + theme (src/shared/theme) for Tactical styling.
module.exports = config;
