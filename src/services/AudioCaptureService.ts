/**
 * Audio capture for APRS decoder – raw PCM from microphone.
 * Uses react-native-microphone-stream. Feeds DecoderService.
 * Runs capture in background; DSP yields to UI via setImmediate.
 */

import { Platform } from 'react-native';
import MicStream from 'react-native-microphone-stream';
import {
  initDecoder,
  feedDecoderPcm,
  getDecoderAudioLevel,
  resetDecoder,
  type DecoderCallbacks,
} from './DecoderService';

const SAMPLE_RATE = 44100;
const BUFFER_SIZE = 4096;
const BITS_PER_CHANNEL = 16;
const CHANNELS = 1;

let listener: { remove: () => void } | null = null;
let isCapturing = false;

/** Convert Uint8Array (16-bit LE PCM) to Int16Array */
function bytesToInt16(bytes: Uint8Array): Int16Array {
  const len = bytes.length >> 1;
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = bytes[i * 2] | (bytes[i * 2 + 1] << 8);
  }
  return out;
}

export type AudioCaptureCallbacks = DecoderCallbacks & {
  onAudioLevel?: (level: number) => void;
};

export async function startAudioCapture(callbacks: AudioCaptureCallbacks): Promise<boolean> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return false;
  }

  if (isCapturing) return true;

  try {
    MicStream.init({
      bufferSize: BUFFER_SIZE,
      sampleRate: SAMPLE_RATE,
      bitsPerChannel: BITS_PER_CHANNEL,
      channelsPerFrame: CHANNELS,
    });

    initDecoder({
      onPacket: callbacks.onPacket,
      onPreambleDetected: callbacks.onPreambleDetected,
      onAudioLevel: callbacks.onAudioLevel,
    });

    listener = MicStream.addListener((data: Uint8Array) => {
      const pcm = bytesToInt16(data);
      feedDecoderPcm(pcm);
      const level = getDecoderAudioLevel(pcm);
      callbacks.onAudioLevel?.(level);
    });

    MicStream.start();
    isCapturing = true;
    return true;
  } catch (e) {
    console.warn('[AEGIS] Audio capture start failed:', e);
    return false;
  }
}

export function stopAudioCapture(): void {
  if (!isCapturing) return;
  try {
    MicStream.stop();
    listener?.remove();
    listener = null;
    resetDecoder();
    isCapturing = false;
  } catch (e) {
    console.warn('[AEGIS] Audio capture stop failed:', e);
  }
}

export function isAudioCaptureActive(): boolean {
  return isCapturing;
}
