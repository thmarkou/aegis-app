/**
 * CommsScreen – minimal root, no Modal.
 */
import React from 'react';
import { SafeAreaView } from 'react-native';
import { CommsScreenContent } from './CommsScreenContent';

export function CommsScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
      <CommsScreenContent />
    </SafeAreaView>
  );
}
