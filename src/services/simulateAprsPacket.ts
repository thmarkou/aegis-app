/**
 * Debug: inject a synthetic position packet as if received over RF, with digipeater path.
 */
import * as SecureSettings from '../shared/services/secureSettings';
import { routeDecodedPacket } from './DecodedPacketRouter';

/** Fixed test position (Athens area) so map/parser stay valid. */
const SIM_LATLON = '!3758.29N/02343.54E#';

export async function simulateOwnPacketWithDigipeaterPath(): Promise<void> {
  const [callsign, ssid] = await Promise.all([
    SecureSettings.getCallsign(),
    SecureSettings.getSsid(),
  ]);
  const src = ssid > 0 ? `${callsign}-${ssid}` : callsign;
  const packet = `${src}>APRS,WIDE1-1,WIDE2-1:${SIM_LATLON} SIM_PATH`;
  await routeDecodedPacket(packet);
}
