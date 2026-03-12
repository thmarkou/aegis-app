/**
 * Minimal CommsScreen for debugging tab bar lock.
 * Only View + Text – no imports of mic, decoder, reanimated, etc.
 * If tab bar works with this, the problem is in CommsScreen's imports/content.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function CommsScreenMinimal() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>COMMS (minimal test)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  text: { color: '#FFBF00', fontSize: 18 },
});
