/**
 * Emergency broadcast – sends APRS status >EMERGENCY! and position with EMERGENCY comment.
 * Position packet ensures the station appears on the map with pulsing emergency marker.
 */
import * as Location from 'expo-location';
import { buildStatusPacket, buildPositionPacket } from './AprsService';
import { routeDecodedPacket } from './DecodedPacketRouter';
import * as SecureSettings from '../shared/services/secureSettings';
import { useAppStore } from '../shared/store/useAppStore';
import { database } from '../database';
import type IncomingStation from '../database/models/IncomingStation';

export type EmergencyResult =
  | { success: true; packet: string }
  | { success: false; error: string };

export async function sendEmergencyBroadcast(): Promise<EmergencyResult> {
  useAppStore.getState().setGlobalEmergency(true);

  try {
    const [callsign, ssid, testMode] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
      SecureSettings.getTestMode(),
    ]);

    const comment = testMode ? 'TEST: EMERGENCY!' : 'EMERGENCY!';

    const statusPacket = buildStatusPacket(callsign, ssid, comment, null, undefined);
    await routeDecodedPacket(statusPacket);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const positionPacket = buildPositionPacket(callsign, ssid, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude ?? undefined,
        comment,
      }, null, undefined);
      await routeDecodedPacket(positionPacket);
    }

    return { success: true, packet: statusPacket };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}

const ALL_CLEAR_COMMENT = 'ALL CLEAR / MISSION CONTINUES';

async function wipeEmergencyStationsFromDb(): Promise<void> {
  await database.write(async () => {
    const collection = database.get<IncomingStation>('incoming_stations');
    const all = await collection.query().fetch();
    const toDelete = all.filter((r) =>
      (r.comment ?? '').toUpperCase().includes('EMERGENCY')
    );
    for (const r of toDelete) {
      await r.destroyPermanently();
    }
  });
}

/**
 * Cancels active emergency: sets global flag false immediately, wipes emergency stations from DB,
 * sends ALL CLEAR packets, triggers map refresh.
 */
export async function cancelEmergencyBroadcast(): Promise<EmergencyResult> {
  useAppStore.getState().setGlobalEmergency(false);

  try {
    await wipeEmergencyStationsFromDb();

    const [callsign, ssid] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
    ]);

    const statusPacket = buildStatusPacket(callsign, ssid, ALL_CLEAR_COMMENT, null, undefined);
    await routeDecodedPacket(statusPacket);

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const positionPacket = buildPositionPacket(callsign, ssid, {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        altitude: pos.coords.altitude ?? undefined,
        comment: ALL_CLEAR_COMMENT,
      }, null, undefined);
      await routeDecodedPacket(positionPacket);
    }

    useAppStore.getState().triggerMapRefresh();
    return { success: true, packet: statusPacket };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : 'Unknown error',
    };
  }
}
