import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Platform } from 'react-native';

const RED = '#ef4444';

/**
 * Blinking red weight display for over-limit warning.
 * Used when kit total weight (items + water) exceeds the 20% body weight tactical limit.
 */
export function BlinkingRedWarning({ text }: { text: string }) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();
    return () => blink.stop();
  }, [opacity]);

  return (
    <Animated.Text style={[styles.text, { opacity }]}>
      {text}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    fontWeight: '600',
    color: RED,
    letterSpacing: 1,
    textShadowColor: RED,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
});
