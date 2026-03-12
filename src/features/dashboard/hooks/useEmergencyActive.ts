/**
 * Observes incoming_stations for our callsign+ssid and returns true when
 * the station's comment contains EMERGENCY (or TEST: EMERGENCY).
 */
import { useEffect, useState } from 'react';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type IncomingStation from '../../../database/models/IncomingStation';
import * as SecureSettings from '../../../shared/services/secureSettings';

export function useEmergencyActive(): boolean {
  const [isActive, setIsActive] = useState(false);
  const [identity, setIdentity] = useState<{ callsign: string; ssid: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([SecureSettings.getCallsign(), SecureSettings.getSsid()]).then(
      ([callsign, ssid]) => {
        if (!cancelled) setIdentity({ callsign, ssid });
      }
    );
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!identity) return;
    const collection = database.get<IncomingStation>('incoming_stations');
    const subscription = collection
      .query(Q.where('callsign', identity.callsign), Q.where('ssid', identity.ssid))
      .observe()
      .subscribe((rows) => {
        const station = rows[0];
        setIsActive(
          station != null && (station.comment ?? '').toUpperCase().includes('EMERGENCY')
        );
      });
    return () => subscription.unsubscribe();
  }, [identity]);

  return isActive;
}
