import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { tactical } from '../../../shared/tacticalStyles';

const BARS = 8;
const BAR_WIDTH = 4;
const BAR_GAP = 6;

interface WaveformVisualizerProps {
  isActive: boolean;
  color?: string;
}

function Bar({ isActive, color }: { isActive: boolean; color: string }) {
  const height = useSharedValue(4);
  useEffect(() => {
    if (isActive) {
      height.value = withRepeat(
        withSequence(
          withTiming(24, { duration: 250, easing: Easing.inOut(Easing.ease) }),
          withTiming(4, { duration: 250, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(4, { duration: 150 });
    }
    return () => cancelAnimation(height);
  }, [isActive]);
  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    backgroundColor: color,
  }));
  return <Animated.View style={[styles.bar, animatedStyle]} />;
}

export function WaveformVisualizer({ isActive, color = tactical.amber }: WaveformVisualizerProps) {
  return (
    <View style={styles.container}>
      {Array.from({ length: BARS }, (_, i) => (
        <Bar key={i} isActive={isActive} color={color} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 32,
    gap: BAR_GAP,
    marginVertical: 12,
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 2,
    minHeight: 4,
  },
});
