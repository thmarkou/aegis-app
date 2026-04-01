/**
 * Routes decoded APRS packets: DB updates, map stations, message log, notifications.
 */

import { Q } from '@nozbe/watermelondb';
import { database } from '../database';
import type MessageLog from '../database/models/MessageLog';
import type IncomingStation from '../database/models/IncomingStation';
import { parseAprsPacket } from './AprsPacketParser';
import * as SecureSettings from '../shared/services/secureSettings';
import { useDigipeaterStore } from '../shared/store/useDigipeaterStore';

export type PacketRouterCallbacks = {
  onIncomingMessage?: (message: string, source: string) => void;
  onIncomingStation?: (callsign: string, lat: number, lon: number) => void;
  onRawPacket?: (raw: string) => void;
};

let routerCallbacks: PacketRouterCallbacks | null = null;

export function setPacketRouterCallbacks(cbs: PacketRouterCallbacks | null): void {
  routerCallbacks = cbs;
}

async function upsertIncomingStation(
  callsign: string,
  ssid: number,
  data: { latitude: number; longitude: number; altitude?: number; comment?: string }
): Promise<void> {
  await database.write(async () => {
    const collection = database.get<IncomingStation>('incoming_stations');
    const existing = await collection
      .query(Q.where('callsign', callsign), Q.where('ssid', ssid))
      .fetch();
    const now = Date.now();
    if (existing.length > 0) {
      await existing[0].update((r) => {
        r.latitude = data.latitude;
        r.longitude = data.longitude;
        r.altitude = data.altitude ?? null;
        r.lastSeenAt = now;
        r.comment = data.comment ?? null;
      });
    } else {
      await collection.create((r) => {
        r.callsign = callsign;
        r.ssid = ssid;
        r.latitude = data.latitude;
        r.longitude = data.longitude;
        r.altitude = data.altitude ?? null;
        r.lastSeenAt = now;
        r.comment = data.comment ?? null;
      });
    }
  });
}

export async function routeDecodedPacket(rawPacket: string): Promise<void> {
  routerCallbacks?.onRawPacket?.(rawPacket);

  const parsed = parseAprsPacket(rawPacket);
  if (!parsed) return;

  try {
    const [ourCallsign, ourSsid] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
    ]);
    if (
      parsed.sourceCallsign.toUpperCase() === ourCallsign.toUpperCase() &&
      parsed.sourceSsid === ourSsid &&
      parsed.digipeaters.length > 0
    ) {
      useDigipeaterStore.getState().recordFromOurPacketPath(parsed.digipeaters);
    }
    if (parsed.payloadType === 'position' && parsed.position) {
      await upsertIncomingStation(
        parsed.sourceCallsign,
        parsed.sourceSsid,
        {
          latitude: parsed.position.lat,
          longitude: parsed.position.lon,
          altitude: parsed.position.altitude,
          comment: parsed.position.comment,
        }
      );
      routerCallbacks?.onIncomingStation?.(
        `${parsed.sourceCallsign}-${parsed.sourceSsid}`,
        parsed.position.lat,
        parsed.position.lon
      );
    }

    if (
      (parsed.payloadType === 'message' || parsed.payloadType === 'status') &&
      parsed.message
    ) {
      await database.write(async () => {
        await database.get<MessageLog>('message_logs').create((r) => {
          r.message = `[${parsed!.sourceCallsign}-${parsed!.sourceSsid}] ${parsed!.message}`;
          r.sentAt = Date.now();
        });
      });
      routerCallbacks?.onIncomingMessage?.(
        parsed.message,
        `${parsed.sourceCallsign}-${parsed.sourceSsid}`
      );
    }
  } catch (e) {
    console.warn('[AEGIS] Packet route error:', e);
  }
}
