/**
 * Oscilloscope-style waveform monitor for AFSK transmit burst.
 * Displays downsampled PCM when triggered by Send Beacon.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';

const WIDTH = 280;
const HEIGHT = 60;
const AMBER = '#FFBF00';
const ZINC_700 = '#3f3f46';
const ZINC_500 = '#71717a';

/** Downsample PCM to ~200 points for display */
function downsample(pcm: Int16Array, maxPoints: number): number[] {
  if (pcm.length === 0) return [];
  const step = Math.max(1, Math.floor(pcm.length / maxPoints));
  const out: number[] = [];
  for (let i = 0; i < pcm.length && out.length < maxPoints; i += step) {
    out.push(pcm[i] / 32768);
  }
  return out;
}

/** Convert normalized samples (-1..1) to SVG path */
function samplesToPath(samples: number[]): string {
  if (samples.length < 2) return '';
  const midY = HEIGHT / 2;
  const scaleY = (HEIGHT / 2) * 0.9;
  const stepX = WIDTH / (samples.length - 1);
  let path = `M 0 ${midY - samples[0] * scaleY}`;
  for (let i = 1; i < samples.length; i++) {
    path += ` L ${i * stepX} ${midY - samples[i] * scaleY}`;
  }
  return path;
}

type Props = {
  pcm: Int16Array | null;
};

export function WaveformMonitor({ pcm }: Props) {
  if (!pcm || pcm.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.waveformBox}>
          <Text style={styles.placeholder}>Press SEND BEACON to see waveform</Text>
        </View>
      </View>
    );
  }

  const samples = downsample(pcm, 250);
  const path = samplesToPath(samples);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>TX WAVEFORM</Text>
      <View style={styles.waveformBox}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
          <Path
            d={path}
            fill="none"
            stroke={AMBER}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: AMBER,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 6,
  },
  waveformBox: {
    width: WIDTH,
    height: HEIGHT,
    backgroundColor: ZINC_700,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ZINC_500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    color: ZINC_500,
    fontSize: 11,
  },
});
