import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tactical } from '../../../shared/tacticalStyles';

const BAR_HEIGHT = 6;
const MAX_WIDTH = 120;

interface VUMeterProps {
  level: number;
  isActive: boolean;
}

export function VUMeter({ level, isActive }: VUMeterProps) {
  const width = useSharedValue(0);

  useEffect(() => {
    const target = isActive ? Math.min(1, level * 3) * MAX_WIDTH : 0;
    width.value = withTiming(target, {
      duration: 80,
      easing: Easing.out(Easing.ease),
    });
  }, [level, isActive, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.bar, animatedStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: MAX_WIDTH + 8,
    height: BAR_HEIGHT + 4,
  },
  track: {
    height: BAR_HEIGHT,
    backgroundColor: tactical.zinc[700],
    borderRadius: 3,
    overflow: 'hidden',
  },
  bar: {
    height: BAR_HEIGHT,
    backgroundColor: tactical.amber,
    borderRadius: 3,
  },
});
