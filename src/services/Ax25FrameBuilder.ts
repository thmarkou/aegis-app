/**
 * AX.25 frame builder for loopback test.
 * Builds flag + address + control + info + FCS + flag, then applies bit stuffing and NRZI.
 */

const FLAG = 0x7e;
const CONTROL_UI = 0x03;

/** Encode callsign to 7-byte AX.25 address (6 chars + SSID, LSB for address extension) */
function encodeAddress(callsign: string, ssid: number): number[] {
  const padded = (callsign + '      ').slice(0, 6).toUpperCase();
  const bytes: number[] = [];
  for (let i = 0; i < 6; i++) {
    bytes.push((padded.charCodeAt(i) || 0x20) << 1);
  }
  bytes.push(0x61 | (ssid << 1));
  return bytes;
}

/** CRC-16-CCITT (same as DecoderService checkFcs) over bytes – returns value to append */
function computeFcs(bytes: number[]): number {
  let fcs = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    fcs ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      if (fcs & 1) fcs = (fcs >> 1) ^ 0x8408;
      else fcs >>= 1;
    }
  }
  return fcs;
}

/** Build raw frame bytes: dest + src + control + info (no PID for simpler parsing) */
function buildFrameBytes(destCallsign: string, destSsid: number, srcCallsign: string, srcSsid: number, info: string): number[] {
  const dest = encodeAddress(destCallsign, destSsid);
  const src = encodeAddress(srcCallsign, srcSsid);
  const frame = [...dest, ...src, CONTROL_UI, ...info.split('').map((c) => c.charCodeAt(0))];
  const fcs = computeFcs(frame);
  return [...frame, fcs & 0xff, (fcs >> 8) & 0xff];
}

/** Convert bytes to bits (LSB first, no start/stop) */
function bytesToBits(bytes: number[]): number[] {
  const bits: number[] = [];
  for (const b of bytes) {
    for (let i = 0; i < 8; i++) {
      bits.push((b >> i) & 1);
    }
  }
  return bits;
}

/** Bit stuffing: insert 0 after 5 consecutive 1s (AX.25) */
function stuff(bits: number[]): number[] {
  const out: number[] = [];
  let ones = 0;
  for (const b of bits) {
    out.push(b);
    if (b === 1) {
      ones++;
      if (ones === 5) {
        out.push(0);
        ones = 0;
      }
    } else {
      ones = 0;
    }
  }
  return out;
}

/** NRZI encode: 0 = transition, 1 = no transition (matches DecoderService nrziDecode inverse) */
function nrziEncode(bits: number[]): number[] {
  const out: number[] = [];
  let last = 1;
  for (const b of bits) {
    const sent = b ^ last;
    out.push(sent);
    last = sent;
  }
  return out;
}

/** Build full AX.25 frame as NRZI-encoded stuffed bits (excluding flags; flags sent as raw) */
function buildFrameBits(destCallsign: string, destSsid: number, srcCallsign: string, srcSsid: number, info: string): number[] {
  const frameBytes = buildFrameBytes(destCallsign, destSsid, srcCallsign, srcSsid, info);
  const rawBits = bytesToBits(frameBytes);
  const stuffed = stuff(rawBits);
  return nrziEncode(stuffed);
}

/** Flag as 8 bits (0x7e) */
const FLAG_BITS = [0, 1, 1, 1, 1, 1, 1, 0];

/** ~300ms preamble at 1200 baud: 360 bits = 45 flags. Gives decoder time to lock clock recovery. */
const PREAMBLE_FLAG_COUNT = 45;

/**
 * Build complete AX.25 frame as bit array: preamble (300ms flags) + frame + flag.
 * Ready for AFSK modulation.
 */
export function buildAx25FrameBits(
  destCallsign: string,
  destSsid: number,
  srcCallsign: string,
  srcSsid: number,
  info: string
): number[] {
  const preambleBits: number[] = [];
  for (let i = 0; i < PREAMBLE_FLAG_COUNT; i++) {
    preambleBits.push(...FLAG_BITS);
  }
  const frameBits = buildFrameBits(destCallsign, destSsid, srcCallsign, srcSsid, info);
  return [...preambleBits, ...frameBits, ...FLAG_BITS];
}
