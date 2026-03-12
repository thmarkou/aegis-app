/**
 * Minimal diagnostic screen – if Tab Bar works here, the problem is in CommsScreen/CommsScreenContent.
 */
import React from 'react';
import { View, Text } from 'react-native';

export function CommsTest() {
  return (
    <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: '#fff' }}>Comms Test – Tab Bar diagnostic</Text>
    </View>
  );
}
