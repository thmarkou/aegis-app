/**
 * Internal Loopback Test – verifies APRS DSP pipeline without physical cables.
 * Builds AX.25 frame, generates AFSK PCM, feeds into DecoderService.
 */

import { generateAFSKPcmFromBits } from './AudioEngine';
import { buildAx25FrameBits } from './Ax25FrameBuilder';
import { initDecoder, feedDecoderPcm, resetDecoder } from './DecoderService';
import { routeDecodedPacket } from './DecodedPacketRouter';
import { isAudioCaptureActive, stopAudioCapture } from './AudioCaptureService';

// Acropolis, Athens – TAKTICAL-1 = external station (not user callsign)
const LOOPBACK_PACKET = 'TAKTICAL-1>APRS,WIDE1-1:!3758.29N/02343.54E#AEGIS TEST';
const CHUNK_SIZE = 4096;
const TIMEOUT_MS = 5000;

export type LoopbackResult =
  | { success: true; message: string; wasCapturing: boolean }
  | { success: false; error: string; wasCapturing: boolean };

/**
 * Direct test – bypasses PCM/Decoder. Calls routeDecodedPacket with mock APRS string.
 * Use to verify Map, DB, and Notifications work before fixing Audio DSP.
 */
export async function runDirectTest(): Promise<LoopbackResult> {
  try {
    await routeDecodedPacket(LOOPBACK_PACKET);
    return { success: true, message: 'DIRECT_TEST: Packet routed. Check Map (blue marker) and Notification.', wasCapturing: false };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
      wasCapturing: false,
    };
  }
}

/**
 * Runs internal loopback test: generate PCM → feed decoder → validate routing.
 * Temporarily stops mic capture if active. Caller should restart capture when
 * wasCapturing is true (e.g. by toggling decoder off/on in UI).
 */
export async function runLoopbackTest(): Promise<LoopbackResult> {
  const wasCapturing = isAudioCaptureActive();
  if (wasCapturing) {
    stopAudioCapture();
  }

  return new Promise<LoopbackResult>((resolve) => {
    let resolved = false;

    const finish = (result: LoopbackResult) => {
      if (resolved) return;
      resolved = true;
      resetDecoder();
      resolve(result);
    };

    const timeout = setTimeout(() => {
      finish({
        success: false,
        error: 'LOOPBACK_TIMEOUT: Decoder did not produce packet in time.',
        wasCapturing,
      });
    }, TIMEOUT_MS);

    initDecoder({
      onPacket: (raw) => {
        routeDecodedPacket(raw);
        clearTimeout(timeout);
        finish({ success: true, message: 'LOOPBACK_SUCCESS: STATION_DECODED', wasCapturing });
      },
    });

    const bits = buildAx25FrameBits('APRS', 0, 'TAKTICAL', 1, LOOPBACK_PACKET);
    const pcm = generateAFSKPcmFromBits(bits, true);

    const feedChunksAsync = () => {
      let i = 0;
      const feedNext = () => {
        if (i >= pcm.length) return;
        const chunk = pcm.subarray(i, Math.min(i + CHUNK_SIZE, pcm.length));
        feedDecoderPcm(chunk);
        i += CHUNK_SIZE;
        if (i < pcm.length) {
          setImmediate(feedNext);
        }
      };
      setImmediate(feedNext);
    };
    feedChunksAsync();

    // Decoder processes async via setImmediate; onPacket will fire when done.
    // If no packet arrives, timeout will fire.
  });
}
