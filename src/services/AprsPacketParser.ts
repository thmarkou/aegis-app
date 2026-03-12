/**
 * APRS packet parser for inbound decoded packets.
 * Parses callsign, SSID, and payload (position or message).
 */

export type ParsedAprsPacket = {
  sourceCallsign: string;
  sourceSsid: number;
  payloadType: 'position' | 'message' | 'status' | 'unknown';
  position?: { lat: number; lon: number; altitude?: number; comment?: string };
  message?: string;
  rawPayload: string;
};

/**
 * Parse APRS position format: !ddmm.hhN/dddmm.mmW or =ddmm.hhN/dddmm.mmW
 * Also handles /A=xxxxxx for altitude in feet.
 */
function parseAprsPosition(payload: string): ParsedAprsPacket['position'] | null {
  // Match ! or = followed by lat/lon. Format: ddmm.hhN/S and dddmm.hhE/W
  const posMatch = payload.match(/^[!=]([\d.]+)([NS])\/([\d.]+)([EW])/);
  if (!posMatch) return null;

  const [, latStr, latDir, lonStr, lonDir] = posMatch;
  const lat = parseAprsCoord(latStr!, latDir);
  const lon = parseAprsCoord(lonStr!, lonDir);
  if (lat == null || lon == null) return null;

  let altitude: number | undefined;
  const altMatch = payload.match(/\/A=(\d{6})/);
  if (altMatch) {
    const altFeet = parseInt(altMatch[1], 10);
    altitude = Math.round(altFeet / 3.28084); // feet to meters
  }

  const symIdx = payload.indexOf('/');
  const symEnd = payload.indexOf(' ', symIdx);
  const commentStart = symIdx >= 0 ? (symEnd >= 0 ? symEnd : payload.indexOf(' ', symIdx + 10)) : symIdx;
  const comment = commentStart >= 0 ? payload.slice(commentStart).trim() : undefined;

  return { lat, lon, altitude, comment };
}

function parseAprsCoord(str: string, dir: string): number | null {
  let val = parseFloat(str);
  if (isNaN(val)) return null;
  const deg = Math.floor(val / 100);
  const min = (val - deg * 100) / 60;
  val = deg + min;
  if (dir === 'S' || dir === 'W') val = -val;
  return val;
}

/**
 * Parse full APRS packet string.
 * Format: SOURCE>DEST,WIDEn-N:payload
 */
export function parseAprsPacket(packet: string): ParsedAprsPacket | null {
  const colonIdx = packet.indexOf(':');
  if (colonIdx < 0) return null;

  const header = packet.slice(0, colonIdx);
  const payload = packet.slice(colonIdx + 1).trim();

  const srcPart = header.split('>')[0];
  if (!srcPart) return null;

  const srcMatch = srcPart.match(/^([A-Z0-9]+)-(\d+)$/);
  const srcFallback = srcPart.match(/^([A-Z0-9]+)$/);
  let sourceCallsign = '';
  let sourceSsid = 0;

  if (srcMatch) {
    sourceCallsign = srcMatch[1];
    sourceSsid = parseInt(srcMatch[2], 10);
  } else if (srcFallback) {
    sourceCallsign = srcFallback[1];
  } else {
    return null;
  }

  // Position: ! or = at start
  if (payload.startsWith('!') || payload.startsWith('=')) {
    const position = parseAprsPosition(payload);
    if (position) {
      return {
        sourceCallsign,
        sourceSsid,
        payloadType: 'position',
        position,
        rawPayload: payload,
      };
    }
  }

  // Status: > at start
  if (payload.startsWith('>')) {
    return {
      sourceCallsign,
      sourceSsid,
      payloadType: 'status',
      message: payload.slice(1).trim(),
      rawPayload: payload,
    };
  }

  // Message: :DEST:msg or generic text
  return {
    sourceCallsign,
    sourceSsid,
    payloadType: 'message',
    message: payload,
    rawPayload: payload,
  };
}
