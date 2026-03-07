import React from 'react';
import { View, Text } from 'react-native';
import { tacticalStyles } from '../../../shared/tacticalStyles';

export function DashboardScreen() {
  return (
    <View style={tacticalStyles.centerScreen}>
      <Text style={tacticalStyles.titleAmber}>AEGIS</Text>
      <Text style={tacticalStyles.titleAmberMuted}>
        Survival Readiness Score
      </Text>
      <Text style={tacticalStyles.subtext}>Dashboard coming soon</Text>
    </View>
  );
}
