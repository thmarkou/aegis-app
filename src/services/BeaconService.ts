/**
 * Sends APRS position beacon using user's real GPS.
 * Plays AFSK audio through phone output (for radio/cable) with TX delay and digital gain.
 */
import * as Location from 'expo-location';
import { buildPositionPacket } from './AprsService';
import { routeDecodedPacket } from './DecodedPacketRouter';
import { playAFSKPacket } from './AudioEngine';
import * as SecureSettings from '../shared/services/secureSettings';

export type SendBeaconResult =
  | { success: true; packet: string }
  | { success: false; error: string };

export type SendBeaconOptions = {
  onWaveform?: (pcm: Int16Array) => void;
};

export async function sendBeaconWithUserGps(
  options: SendBeaconOptions = {}
): Promise<SendBeaconResult> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'Location permission denied' };
    }

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const [callsign, ssid, testMode, txDelayMs, digitalGain] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getTestMode(),
      SecureSettings.getTxDelayMs(),
      SecureSettings.getDigitalGain(),
    ]);

    const comment = testMode ? 'TEST: AEGIS BEACON' : 'AEGIS BEACON';
    const packet = buildPositionPacket(
      callsign,
      ssid,
      {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude ?? undefined,
        comment,
      },
      null,
      undefined
    );

    await playAFSKPacket(packet, {
      txDelayMs,
      digitalGain,
      onWaveform: options.onWaveform,
    });

    await routeDecodedPacket(packet);
    return { success: true, packet };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
