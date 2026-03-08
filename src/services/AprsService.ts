/**
 * APRS packet generator for AEGIS.
 * Converts position and messages to APRS-format packets (text only; audio in Phase 2c).
 */

export interface AprsPosition {
  latitude: number;
  longitude: number;
  altitude?: number;
  comment?: string;
}

/**
 * Converts decimal degrees to APRS format: ddmm.hhN/S or dddmm.hhE/W
 */
function toAprsCoord(value: number, isLat: boolean): string {
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minTotal = (abs - deg) * 60;
  const min = Math.floor(minTotal);
  const hundredths = Math.round((minTotal - min) * 100);
  const hh = Math.min(99, hundredths);

  const pad = isLat ? 2 : 3;
  const degStr = deg.toString().padStart(pad, '0');
  const minStr = min.toString().padStart(2, '0');
  const hhStr = hh.toString().padStart(2, '0');
  const dir = isLat ? (value >= 0 ? 'N' : 'S') : (value >= 0 ? 'E' : 'W');

  return `${degStr}${minStr}.${hhStr}${dir}`;
}

/**
 * Builds APRS position packet.
 * Format: CALLSIGN-SSID>APRS,WIDE1-1:!/ddmm.mmN/dddmm.mmW.../A=... comment
 */
export function buildPositionPacket(
  callsign: string,
  ssid: number,
  position: AprsPosition
): string {
  const src = ssid > 0 ? `${callsign}-${ssid}` : callsign;
  const lat = toAprsCoord(position.latitude, true);
  const lon = toAprsCoord(position.longitude, false);
  const symbol = '/'; // APRS position symbol
  const symCode = '>'; // default icon

  let body = `!${lat}${symbol}${lon}${symCode}`;
  if (position.altitude != null && position.altitude > 0) {
    const altFeet = Math.round(position.altitude * 3.28084);
    body += `/A=${altFeet.toString().padStart(6, '0')}`;
  }
  if (position.comment) {
    body += ` ${position.comment}`;
  }

  return `${src}>APRS,WIDE1-1:${body}`;
}

/**
 * Builds SMSGTE packet for SMS gateway.
 * Format: :SMSGTE   :@+3069XXXXXXXX [message]
 */
export function buildSmsgtePacket(
  callsign: string,
  ssid: number,
  destinationPhone: string,
  message: string
): string {
  const src = ssid > 0 ? `${callsign}-${ssid}` : callsign;
  const dest = destinationPhone.startsWith('+') ? destinationPhone : `+${destinationPhone}`;
  const destPadded = `@${dest}`.padEnd(10, ' ');
  return `${src}>APRS,WIDE1-1::SMSGTE   :${destPadded}${message}`;
}
