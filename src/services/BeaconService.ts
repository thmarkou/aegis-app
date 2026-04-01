/**
 * Sends APRS position beacon using user's real GPS.
 * Plays AFSK audio through phone output (for radio/cable) with TX delay and digital gain.
 */
import * as Location from 'expo-location';
import {
  buildAegisTelemetryComment,
  buildPositionPacket,
  buildSmsgteMessageWithTelemetry,
  buildSmsgtePacket,
} from './AprsService';
import { routeDecodedPacket } from './DecodedPacketRouter';
import { playAFSKPacket } from './AudioEngine';
import * as SecureSettings from '../shared/services/secureSettings';
import { getInventoryAprsStatus } from './inventoryAprsStatus';
import { CACHE_TTL_MS, useGarminStore } from '../shared/store/useGarminStore';

export type SendBeaconResult =
  | { success: true; packet: string }
  | { success: false; error: string };

export type SendBeaconOptions = {
  onWaveform?: (pcm: Int16Array) => void;
};

/**
 * Sends SMSGTE-formatted APRS for SMS gateway (emergency contact).
 * Message is truncated for typical APRS/SMSGTE limits.
 */
export async function sendEmergencySmsgte(
  message: string,
  options: SendBeaconOptions = {}
): Promise<SendBeaconResult> {
  try {
    const [callsign, ssid, txDelayMs, digitalGain, phone, invStatus] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getTxDelayMs(),
      SecureSettings.getDigitalGain(),
      SecureSettings.getEmergencySmsNumber(),
      getInventoryAprsStatus(),
    ]);
    if (!phone?.trim()) {
      return { success: false, error: 'Emergency SMS number not set (Settings)' };
    }
    const g = useGarminStore.getState();
    const hrCached =
      g.cachedHeartRateAt != null && Date.now() - g.cachedHeartRateAt < CACHE_TTL_MS
        ? g.cachedHeartRate
        : null;
    const heartRateBpm = g.heartRate ?? hrCached;
    const telemetry = buildAegisTelemetryComment(heartRateBpm, invStatus);
    const text = buildSmsgteMessageWithTelemetry(message, telemetry);
    if (!text.trim()) {
      return { success: false, error: 'Message is empty' };
    }
    const packet = buildSmsgtePacket(callsign, ssid, phone.trim(), text);
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

    const [callsign, ssid, testMode, txDelayMs, digitalGain, invStatus] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getTestMode(),
      SecureSettings.getTxDelayMs(),
      SecureSettings.getDigitalGain(),
      getInventoryAprsStatus(),
    ]);

    const g = useGarminStore.getState();
    const hrLive = g.heartRate;
    const hrCached =
      g.cachedHeartRateAt != null && Date.now() - g.cachedHeartRateAt < CACHE_TTL_MS
        ? g.cachedHeartRate
        : null;
    const heartRateBpm = hrLive ?? hrCached;
    const telemetry = buildAegisTelemetryComment(heartRateBpm, invStatus);
    const comment = testMode ? `TEST: ${telemetry}` : telemetry;

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
