/**
 * AFSK 1200 baud Bell 202 audio generator for AEGIS.
 * Mark = 1200Hz, Space = 2200Hz.
 * Output: PCM WAV file for expo-av playback.
 */

import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

const SAMPLE_RATE = 44100;
const BAUD_RATE = 1200;
const MARK_FREQ = 1200;
const SPACE_FREQ = 2200;
const SAMPLES_PER_BIT = Math.round(SAMPLE_RATE / BAUD_RATE);
const AMPLITUDE = 0.85 * 32767; // 85% for transmit
const LOOPBACK_AMPLITUDE = 0.9 * 32767; // 90% for internal loopback – decoder needs strong signal
const POST_DELAY_MS = 100;

/**
 * Converts string to bits using 8N1 serial encoding.
 * Each byte: 1 start bit (0) + 8 data bits (LSB first) + 1 stop bit (1)
 */
function stringToBits(str: string): number[] {
  const bits: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const byte = str.charCodeAt(i) & 0xff;
    bits.push(0); // start bit
    for (let b = 0; b < 8; b++) {
      bits.push((byte >> b) & 1);
    }
    bits.push(1); // stop bit
  }
  return bits;
}

/**
 * Generates sine wave samples for a given frequency and duration.
 */
function generateTone(
  freq: number,
  numSamples: number,
  startPhase: number,
  amplitude: number = AMPLITUDE
): { samples: Int16Array; endPhase: number } {
  const samples = new Int16Array(numSamples);
  const phaseIncrement = (2 * Math.PI * freq) / SAMPLE_RATE;
  let phase = startPhase;

  for (let i = 0; i < numSamples; i++) {
    samples[i] = Math.round(amplitude * Math.sin(phase));
    phase += phaseIncrement;
  }

  return { samples, endPhase: phase % (2 * Math.PI) };
}

/**
 * Creates WAV file from PCM samples (16-bit mono, 44100 Hz).
 */
function createWavBuffer(pcmSamples: Int16Array): ArrayBuffer {
  const dataLen = pcmSamples.length * 2;
  const headerLen = 44;
  const fileLen = headerLen + dataLen;

  const buffer = new ArrayBuffer(fileLen);
  const view = new DataView(buffer);
  let offset = 0;

  const write = (data: string | number, size: number, type: 'string' | 'uint32' | 'uint16' = 'uint32') => {
    if (type === 'string') {
      for (let i = 0; i < size; i++) {
        view.setUint8(offset++, (data as string).charCodeAt(i));
      }
    } else if (type === 'uint32') {
      view.setUint32(offset, data as number, true);
      offset += 4;
    } else {
      view.setUint16(offset, data as number, true);
      offset += 2;
    }
  };

  // RIFF header
  write('RIFF', 4, 'string');
  write(fileLen - 8, 4);
  write('WAVE', 4, 'string');

  // fmt chunk
  write('fmt ', 4, 'string');
  write(16, 4); // chunk size
  write(1, 2, 'uint16'); // PCM
  write(1, 2, 'uint16'); // mono
  write(SAMPLE_RATE, 4);
  write(SAMPLE_RATE * 2, 4); // byte rate
  write(2, 2, 'uint16'); // block align
  write(16, 2, 'uint16'); // bits per sample

  // data chunk
  write('data', 4, 'string');
  write(dataLen, 4);
  for (let i = 0; i < pcmSamples.length; i++) {
    view.setInt16(offset, pcmSamples[i], true);
    offset += 2;
  }

  return buffer;
}

/**
 * Generates raw PCM (16-bit mono, 44100 Hz) from bit array.
 * Used for AX.25 loopback – bits are already stuffed and NRZI-encoded.
 * Uses LOOPBACK_AMPLITUDE (90%) so decoder can reliably detect the signal.
 * skipPtt: omit preamble for internal loopback – decoder gets data immediately.
 */
export function generateAFSKPcmFromBits(bits: number[], skipPtt = false, txDelayMs = 500): Int16Array {
  const pttSamples = skipPtt ? 0 : Math.round((txDelayMs / 1000) * SAMPLE_RATE);
  const postSamples = Math.round((POST_DELAY_MS / 1000) * SAMPLE_RATE);

  const totalSamples = pttSamples + bits.length * SAMPLES_PER_BIT + postSamples;
  const pcm = new Int16Array(totalSamples);

  let offset = 0;

  for (let i = 0; i < pttSamples; i++) {
    pcm[offset++] = 0;
  }

  let phase = 0;
  for (const bit of bits) {
    const freq = bit ? MARK_FREQ : SPACE_FREQ;
    const { samples, endPhase } = generateTone(freq, SAMPLES_PER_BIT, phase, LOOPBACK_AMPLITUDE);
    phase = endPhase;
    for (let i = 0; i < samples.length; i++) {
      pcm[offset++] = samples[i];
    }
  }

  for (let i = 0; i < postSamples; i++) {
    pcm[offset++] = 0;
  }

  return pcm;
}

export type TransmitAudioOptions = {
  txDelayMs?: number;
  digitalGain?: number;
};

/**
 * Generates raw PCM (16-bit mono, 44100 Hz) from packet string (8N1 serial).
 * Preamble: txDelayMs of 1200Hz pre-carrier tone (VOX opener), then AFSK data, then 100ms silence.
 * digitalGain: multiplies amplitude (0.5–1.5).
 */
export function generateAFSKPcm(
  packetString: string,
  options: TransmitAudioOptions = {}
): Int16Array {
  const { txDelayMs = 300, digitalGain = 1.0 } = options;
  const bits = stringToBits(packetString);
  const preambleSamples = Math.round((txDelayMs / 1000) * SAMPLE_RATE);
  const postSamples = Math.round((POST_DELAY_MS / 1000) * SAMPLE_RATE);
  const dataSamples = bits.length * SAMPLES_PER_BIT;
  const totalSamples = preambleSamples + dataSamples + postSamples;
  const amplitude = AMPLITUDE * Math.max(0.5, Math.min(1.5, digitalGain));
  const pcm = new Int16Array(totalSamples);
  let offset = 0;

  const { samples: preambleTone } = generateTone(MARK_FREQ, preambleSamples, 0, amplitude);
  for (let i = 0; i < preambleSamples; i++) pcm[offset++] = preambleTone[i];

  let phase = 0;
  for (const bit of bits) {
    const freq = bit ? MARK_FREQ : SPACE_FREQ;
    const { samples, endPhase } = generateTone(freq, SAMPLES_PER_BIT, phase, amplitude);
    phase = endPhase;
    for (let i = 0; i < samples.length; i++) pcm[offset++] = samples[i];
  }

  for (let i = 0; i < postSamples; i++) pcm[offset++] = 0;

  return pcm;
}

/**
 * Generates AFSK 1200 baud WAV from packet string.
 */
export function generateAFSKWav(
  packetString: string,
  options: TransmitAudioOptions = {}
): ArrayBuffer {
  return createWavBuffer(generateAFSKPcm(packetString, options));
}

/**
 * Plays PCM through audio output. Used when we already have PCM (e.g. for waveform callback).
 */
export async function playPcm(pcm: Int16Array): Promise<void> {
  const wavBuffer = createWavBuffer(pcm);
  const uri = await writeWavToFile(wavBuffer);
  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.setVolumeAsync(1.0);
  await sound.playAsync();
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !status.isLooping) {
        resolve();
      }
    });
  });
  await sound.unloadAsync();
}

/**
 * Writes WAV buffer to temp file and returns URI for expo-av.
 */
export async function writeWavToFile(wavBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(wavBuffer);
  const base64 = Buffer.from(bytes).toString('base64');
  const path = `${FileSystem.cacheDirectory}aegis_afsk_${Date.now()}.wav`;
  await FileSystem.writeAsStringAsync(path, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return path;
}

/**
 * Plays AFSK packet through audio output.
 * Configures audio session for clean playback (DoNotMix during transmission).
 * Uses txDelayMs and digitalGain from options.
 * Optional onWaveform callback receives PCM for visualization.
 */
export async function playAFSKPacket(
  packetString: string,
  options: TransmitAudioOptions & { onWaveform?: (pcm: Int16Array) => void } = {}
): Promise<void> {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
    interruptionModeAndroid: 1, // DoNotMix
    interruptionModeIOS: 1, // DoNotMix
  });

  const { onWaveform, ...opts } = options;
  const pcm = generateAFSKPcm(packetString, opts);
  onWaveform?.(pcm);

  const wavBuffer = createWavBuffer(pcm);
  const uri = await writeWavToFile(wavBuffer);

  const { sound } = await Audio.Sound.createAsync({ uri });
  await sound.setVolumeAsync(1.0);
  await sound.playAsync();
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish && !status.isLooping) {
        resolve();
      }
    });
  });
  await sound.unloadAsync();
}
