import React from 'react';
import { View, Text } from 'react-native';
import { tacticalStyles } from '../../../shared/tacticalStyles';

export function MapScreen() {
  return (
    <View style={tacticalStyles.centerScreen}>
      <Text style={tacticalStyles.titleAmber}>Tactical Map</Text>
      <Text style={tacticalStyles.subtext}>Repeaters & Bearing Arrow coming soon</Text>
    </View>
  );
}
