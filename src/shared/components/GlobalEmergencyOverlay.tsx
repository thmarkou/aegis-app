/**
 * Global emergency overlay – flashing red screen visible on top of all tabs.
 * Rendered in App.tsx so it stays visible when navigating to Map.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Text, StyleSheet, Platform, Dimensions } from 'react-native';
import { useAppStore } from '../store/useAppStore';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export function GlobalEmergencyOverlay() {
  const visible = useAppStore((s) => s.emergencyOverlayVisible);
  const flashRef = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible) {
      flashRef.setValue(0.8);
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(flashRef, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(flashRef, { toValue: 0.8, duration: 500, useNativeDriver: true }),
        ])
      );
      animation.start();
      return () => {
        animation.stop();
        flashRef.setValue(0);
      };
    }
    flashRef.setValue(0);
  }, [visible, flashRef]);

  if (!visible) return null;

  return (
    <Modal visible={true} transparent animationType="none">
      <Animated.View
        style={[styles.overlay, { opacity: flashRef }]}
        pointerEvents="none"
      >
        <Text style={styles.text}>EMERGENCY!</Text>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  text: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});
