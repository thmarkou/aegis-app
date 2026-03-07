import React from 'react';
import { View, Text } from 'react-native';
import { tacticalStyles } from '../../../shared/tacticalStyles';

export function ProfileScreen() {
  return (
    <View style={tacticalStyles.centerScreen}>
      <Text style={tacticalStyles.titleAmberSm}>Family / Profiles</Text>
      <Text style={tacticalStyles.subtextZinc}>Family scaling settings coming soon</Text>
    </View>
  );
}
