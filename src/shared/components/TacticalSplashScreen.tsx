import React, { useEffect } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { tactical } from '../tacticalStyles';

const PULSE_DURATION = 3000;

export function TacticalSplashScreen() {
  const glowOpacity = useSharedValue(0.08);
  const glowScale = useSharedValue(1);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.22, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.08, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowScale.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: PULSE_DURATION / 2, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.logoWrapper}>
        <Animated.View style={[styles.glowRing, glowStyle]} />
        <Image
          source={require('../../../assets/images/icons/aegis.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>AEGIS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tactical.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  glowRing: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: tactical.amber,
    shadowColor: tactical.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 32,
    elevation: 8,
  },
  logo: {
    width: 200,
    height: 200,
  },
  title: {
    color: tactical.amber,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 4,
  },
});
