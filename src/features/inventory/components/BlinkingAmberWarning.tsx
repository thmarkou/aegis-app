import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { tactical } from '../../../shared/tacticalStyles';

export function BlinkingAmberWarning() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
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
    <Animated.View style={[styles.badge, { opacity }]}>
      <Text style={styles.text}>⚠</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tactical.amber,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  text: {
    color: tactical.black,
    fontSize: 14,
    fontWeight: '700',
  },
});
