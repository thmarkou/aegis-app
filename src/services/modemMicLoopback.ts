/**
 * Starts microphone capture feeding the APRS decoder while audio is played (acoustic loopback test).
 */
import { startAudioCapture, stopAudioCapture } from './AudioCaptureService';
import { routeDecodedPacket } from './DecodedPacketRouter';

export async function startMicDecodeForPlayback(): Promise<boolean> {
  return startAudioCapture({
    onPacket: (raw) => {
      void routeDecodedPacket(raw);
    },
  });
}

export function stopMicDecodeAfterPlayback(): void {
  stopAudioCapture();
}
