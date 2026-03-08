/**
 * Audio output routing detection for AEGIS.
 *
 * LINK: DIGITAL = USB audio device (e.g. ddHiFi) detected → green status
 * LINK: VOX/ANALOG = internal speaker/headphone jack → amber status
 *
 * NOTE: expo-av does not expose getAudioOutputsAsync() or output device detection.
 * USB detection would require a native module (e.g. react-native-audio-routes-events
 * or audio-input-route). Until then, we default to 'analog'.
 */

export type AudioOutputMode = 'digital' | 'analog';

let cachedMode: AudioOutputMode = 'analog';
let listeners: Array<(mode: AudioOutputMode) => void> = [];

/**
 * Returns current audio output mode.
 * Defaults to 'analog' until a native module provides USB detection.
 */
export function getAudioOutputMode(): AudioOutputMode {
  return cachedMode;
}

function notifyListeners(): void {
  listeners.forEach((cb) => cb(cachedMode));
}

/**
 * Subscribes to audio routing changes.
 * Returns unsubscribe function.
 * TODO: Wire to native module (e.g. react-native-audio-routes-events) when added.
 */
export function initAudioRoutingListener(
  onModeChange?: (mode: AudioOutputMode) => void
): () => void {
  if (onModeChange) {
    listeners.push(onModeChange);
    onModeChange(cachedMode);
  }
  return () => {
    if (onModeChange) {
      listeners = listeners.filter((l) => l !== onModeChange);
    }
  };
}
