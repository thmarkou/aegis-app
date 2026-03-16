import React, { useCallback, useRef } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';
import { tactical } from '../tacticalStyles';

type Props = {
  value: number;
  minimumValue: number;
  maximumValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: object;
};

/**
 * Custom View-based slider for maximum visibility.
 * Amber track and thumb, 40px height - always visible.
 */
export function TacticalSlider({
  value,
  minimumValue,
  maximumValue,
  step = 1,
  onValueChange,
  minimumTrackTintColor = tactical.amber,
  maximumTrackTintColor = tactical.zinc[700],
  thumbTintColor = tactical.amber,
  style,
}: Props) {
  const trackWidth = useRef(200);
  const trackX = useRef(0);
  const trackRef = useRef<View>(null);
  const range = maximumValue - minimumValue;
  const pct = range > 0 ? (value - minimumValue) / range : 0;
  const fillPct = Math.max(0, Math.min(1, pct));

  const roundToStep = useCallback(
    (v: number) => {
      if (step <= 0) return v;
      const steps = Math.round((v - minimumValue) / step);
      return minimumValue + steps * step;
    },
    [minimumValue, step]
  );

  const xToValue = useCallback(
    (x: number) => {
      const w = trackWidth.current;
      const newPct = Math.max(0, Math.min(1, x / w));
      return minimumValue + newPct * range;
    },
    [minimumValue, range]
  );

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const newVal = xToValue(evt.nativeEvent.locationX);
          onValueChange(roundToStep(newVal));
        },
        onPanResponderMove: (_evt, gestureState) => {
          const xInTrack = gestureState.moveX - trackX.current;
          const newVal = xToValue(xInTrack);
          onValueChange(roundToStep(newVal));
        },
      }),
    [xToValue, onValueChange, roundToStep]
  );

  return (
    <View
      ref={trackRef}
      style={[styles.track, { backgroundColor: maximumTrackTintColor }, style]}
      onLayout={(e) => {
        trackWidth.current = e.nativeEvent.layout.width;
        trackRef.current?.measureInWindow((winX) => {
          trackX.current = winX;
        });
      }}
      {...panResponder.panHandlers}
    >
      <View
        style={[
          styles.fill,
          {
            width: `${fillPct * 100}%`,
            backgroundColor: minimumTrackTintColor,
          },
        ]}
      />
      <View
        style={[
          styles.thumb,
          {
            left: `${fillPct * 100}%`,
            backgroundColor: thumbTintColor,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 8,
  },
  thumb: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -12,
    top: 8,
  },
});
