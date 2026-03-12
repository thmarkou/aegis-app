/**
 * APRS AFSK 1200 Decoder – DSP pipeline for Bell 202.
 * Mark=1200Hz, Space=2200Hz, 1200 baud, NRZI, AX.25.
 * Processes PCM in chunks to avoid blocking UI.
 */

const SAMPLE_RATE = 44100;
const BAUD_RATE = 1200;
const MARK_FREQ = 1200;
const SPACE_FREQ = 2200;
const SAMPLES_PER_BIT = Math.round(SAMPLE_RATE / BAUD_RATE);
const FLAG = 0x7e;

export type DecoderCallbacks = {
  onPacket: (rawPacket: string) => void;
  onPreambleDetected?: () => void;
  onAudioLevel?: (level: number) => void;
};

/** Simple IIR bandpass around 1700Hz (captures 1200+2200) */
function bandpassFilter(samples: Int16Array, prev: { x1: number; x2: number; y1: number; y2: number }): void {
  const fc = 1700 / SAMPLE_RATE;
  const bw = 1200 / SAMPLE_RATE;
  const r = 1 - 3 * bw;
  const k = (1 - 2 * r * Math.cos(2 * Math.PI * fc) + r * r) / (2 - 2 * Math.cos(2 * Math.PI * fc));
  const a = [1, -2 * r * Math.cos(2 * Math.PI * fc), r * r];
  const b = [k, -2 * k * Math.cos(2 * Math.PI * fc), k];

  for (let i = 0; i < samples.length; i++) {
    const x = samples[i] / 32768;
    const y = b[0] * x + b[1] * prev.x1 + b[2] * prev.x2 - a[1] * prev.y1 - a[2] * prev.y2;
    prev.x2 = prev.x1;
    prev.x1 = x;
    prev.y2 = prev.y1;
    prev.y1 = y;
    samples[i] = Math.max(-32768, Math.min(32767, Math.round(y * 32768)));
  }
}

/** Zero-crossing demodulator: estimate instantaneous frequency from zero crossings */
function demodulateToBits(samples: Int16Array): number[] {
  const bits: number[] = [];
  const threshold = 0;
  let lastCross = 0;
  let halfPeriodSamples = SAMPLES_PER_BIT / 2;

  for (let i = 1; i < samples.length; i++) {
    if ((samples[i - 1] < threshold && samples[i] >= threshold) || (samples[i - 1] >= threshold && samples[i] < threshold)) {
      const period = (i - lastCross) * 2;
      lastCross = i;
      const freq = SAMPLE_RATE / period;
      bits.push(freq > 1700 ? 1 : 0);
    }
  }
  return bits;
}

/** Clock recovery: sample at bit center, 1200 baud */
function recoverClock(bits: number[], sampleOffset: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < bits.length; i += SAMPLES_PER_BIT) {
    const idx = Math.min(i + Math.floor(SAMPLES_PER_BIT / 2) + sampleOffset, bits.length - 1);
    out.push(bits[idx] ?? 0);
  }
  return out;
}

/** NRZI decode: 0 = transition, 1 = no transition */
function nrziDecode(bits: number[]): number[] {
  const out: number[] = [];
  let last = 1;
  for (const b of bits) {
    const val = b ^ last;
    out.push(val);
    last = b;
  }
  return out;
}

/** Remove bit stuffing: drop 0 after 5 consecutive 1s (AX.25) */
function unstuff(bits: number[]): number[] {
  const out: number[] = [];
  let ones = 0;
  let skipNextZero = false;
  for (const b of bits) {
    if (b === 1) {
      ones++;
      out.push(1);
      if (ones === 5) {
        ones = 0;
        skipNextZero = true;
      }
    } else {
      if (skipNextZero) {
        skipNextZero = false;
      } else {
        out.push(0);
      }
      ones = 0;
    }
  }
  return out;
}

/** Bits to bytes, find flags and extract frame */
function extractFrames(bits: number[]): string[] {
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    let byte = 0;
    for (let j = 0; j < 8; j++) {
      byte |= (bits[i + j] ?? 0) << j;
    }
    bytes.push(byte);
  }

  const frames: string[] = [];
  let inFrame = false;
  let frameBytes: number[] = [];

  for (const b of bytes) {
    if (b === FLAG) {
      if (!inFrame) {
        console.log('[Decoder] Preamble/flag (0x7e) detected');
      }
      if (inFrame && frameBytes.length > 2) {
        const fcsOk = checkFcs(frameBytes);
        if (fcsOk) {
          const infoStart = findInfoStart(frameBytes);
          if (infoStart >= 0) {
            const info = frameBytes.slice(infoStart, -2);
            const str = info.map((x) => String.fromCharCode(x)).join('');
            if (/[\x20-\x7e]/.test(str)) frames.push(str);
          }
        }
      }
      frameBytes = [];
      inFrame = true;
    } else if (inFrame) {
      frameBytes.push(b);
    }
  }
  return frames;
}

function checkFcs(bytes: number[]): boolean {
  if (bytes.length < 4) return false;
  let fcs = 0xffff;
  for (let i = 0; i < bytes.length - 2; i++) {
    fcs ^= bytes[i];
    for (let k = 0; k < 8; k++) {
      if (fcs & 1) fcs = (fcs >> 1) ^ 0x8408;
      else fcs >>= 1;
    }
  }
  const recv = bytes[bytes.length - 2] | (bytes[bytes.length - 1] << 8);
  return (fcs ^ recv) === 0;
}

function findInfoStart(bytes: number[]): number {
  if (bytes.length < 4) return -1;
  let i = 0;
  while (i + 7 < bytes.length) {
    const b = bytes[i];
    if (b === 0x03) return i + 1;
    if ((b & 1) === 0) i += 7;
    else i += 8;
  }
  return -1;
}

/** Process PCM chunk – runs synchronously but caller should invoke in batches */
function processChunk(
  pcm: Int16Array,
  state: {
    filterState: { x1: number; x2: number; y1: number; y2: number };
    bitBuffer: number[];
    lastPacketTime: number;
  }
): string[] {
  let maxAmp = 0;
  for (let i = 0; i < pcm.length; i++) {
    const a = Math.abs(pcm[i]);
    if (a > maxAmp) maxAmp = a;
  }
  const level = maxAmp / 32768;
  if (level > 0.01 && Date.now() - lastEnergyLogTime > 500) {
    lastEnergyLogTime = Date.now();
    console.log('[Decoder] Energy detected, level:', level.toFixed(3), 'samples:', pcm.length);
  }

  const filtered = new Int16Array(pcm.length);
  filtered.set(pcm);
  bandpassFilter(filtered, state.filterState);

  const rawBits = demodulateToBits(filtered);
  state.bitBuffer.push(...rawBits);

  const maxBits = 10000;
  if (state.bitBuffer.length > maxBits) {
    state.bitBuffer = state.bitBuffer.slice(-maxBits);
  }

  const recovered = recoverClock(state.bitBuffer, 0);
  const nrzi = nrziDecode(recovered);
  const unstuffed = unstuff(nrzi);
  const frames = extractFrames(unstuffed);

  return frames;
}

let lastEnergyLogTime = 0;

let decoderState: {
  filterState: { x1: number; x2: number; y1: number; y2: number };
  bitBuffer: number[];
  lastPacketTime: number;
} | null = null;

let callbacks: DecoderCallbacks | null = null;
let processingQueue: Int16Array[] = [];
let isProcessing = false;

function processQueue(): void {
  if (isProcessing || !decoderState || !callbacks || processingQueue.length === 0) return;
  isProcessing = true;

  const processBatch = () => {
    const batch = processingQueue.splice(0, 3);
    const state = decoderState;
    if (batch.length === 0 || !state) {
      isProcessing = false;
      return;
    }

    for (const pcm of batch) {
      const frames = processChunk(pcm, state);
      for (const f of frames) {
        if (f.includes('>') && f.includes(':')) {
          callbacks?.onPacket(f);
          callbacks?.onPreambleDetected?.();
        }
      }
    }

    if (processingQueue.length > 0) {
      setImmediate(processBatch);
    } else {
      isProcessing = false;
    }
  };

  setImmediate(processBatch);
}

export function initDecoder(cbs: DecoderCallbacks): void {
  callbacks = cbs;
  decoderState = {
    filterState: { x1: 0, x2: 0, y1: 0, y2: 0 },
    bitBuffer: [],
    lastPacketTime: 0,
  };
  processingQueue = [];
}

export function feedDecoderPcm(pcm: Int16Array): void {
  if (!decoderState || !callbacks) return;
  processingQueue.push(pcm);
  processQueue();
}

export function getDecoderAudioLevel(pcm: Int16Array): number {
  let sum = 0;
  for (let i = 0; i < pcm.length; i++) {
    sum += Math.abs(pcm[i]);
  }
  return pcm.length > 0 ? sum / pcm.length / 32768 : 0;
}

export function resetDecoder(): void {
  decoderState = null;
  callbacks = null;
  processingQueue = [];
  isProcessing = false;
}
