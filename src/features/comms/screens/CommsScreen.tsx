import React from 'react';
import { View, Text } from 'react-native';
import { tacticalStyles } from '../../../shared/tacticalStyles';

export function CommsScreen() {
  return (
    <View style={tacticalStyles.centerScreen}>
      <Text style={tacticalStyles.titleAmber}>Radio Comms</Text>
      <Text style={tacticalStyles.subtext}>Antenna Calculator & SOS coming soon</Text>
    </View>
  );
}
