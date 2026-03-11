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
  position: AprsPosition,
  batteryPct?: number | null,
  bioString?: string
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
  const commentParts: string[] = [];
  if (position.comment?.trim()) commentParts.push(position.comment.trim());
  if (batteryPct != null) commentParts.push(`[BATT: ${batteryPct}%]`);
  if (bioString?.trim()) commentParts.push(bioString.trim());
  const comment = commentParts.join(' ');
  if (comment) {
    body += ` ${comment}`;
  }

  return `${src}>APRS,WIDE1-1:${body}`;
}

/**
 * Builds APRS status packet (text-only, no position).
 * Format: CALLSIGN-SSID>APRS,WIDE1-1:>message
 * Appends bio string [HR:72 SpO2:98%] when provided.
 */
export function buildStatusPacket(
  callsign: string,
  ssid: number,
  message: string,
  batteryPct?: number | null,
  bioString?: string
): string {
  const src = ssid > 0 ? `${callsign}-${ssid}` : callsign;
  const parts: string[] = [];
  if (message.trim()) parts.push(message.trim());
  if (batteryPct != null) parts.push(`[BATT: ${batteryPct}%]`);
  if (bioString?.trim()) parts.push(bioString.trim());
  const text = parts.join(' ');
  return `${src}>APRS,WIDE1-1:>${text}`;
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
