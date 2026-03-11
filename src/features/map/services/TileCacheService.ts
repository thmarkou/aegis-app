/**
 * Offline map tile caching for react-native-maps.
 * Downloads OSM tiles to local storage, 500MB limit.
 */
import * as FileSystem from 'expo-file-system';

const CACHE_DIR = `${FileSystem.documentDirectory}tiles/`;

/** Raw path for LocalTile (no file:// prefix). */
export function getLocalTilePathTemplate(): string {
  const dir = FileSystem.documentDirectory ?? '';
  const raw = dir.replace(/^file:\/\//, '');
  return `${raw}tiles/{z}/{x}/{y}.png`;
}
const MAX_CACHE_BYTES = 500 * 1024 * 1024; // 500MB
const TILE_SERVER = 'https://tiles.basemaps.cartocdn.com/dark_all';
const MIN_ZOOM = 10;
const MAX_ZOOM = 18;

function lonToTileX(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  );
}

function tilePath(z: number, x: number, y: number): string {
  return `${CACHE_DIR}${z}/${x}/${y}.png`;
}

function tileUrl(z: number, x: number, y: number): string {
  return `${TILE_SERVER}/${z}/${x}/${y}.png`;
}

export function getLocalTileUrlTemplate(): string {
  const base = FileSystem.documentDirectory?.replace('file://', '') ?? '';
  return `file://${base}tiles/{z}/{x}/{y}.png`;
}

export function getRemoteTileUrlTemplate(): string {
  return `${TILE_SERVER}/{z}/{x}/{y}.png`;
}

export async function ensureCacheDir(): Promise<void> {
  const exists = await FileSystem.getInfoAsync(CACHE_DIR);
  if (!exists.exists) {
    await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true });
  }
}

export async function getCacheSizeBytes(): Promise<number> {
  await ensureCacheDir();
  const info = await FileSystem.getInfoAsync(CACHE_DIR, { size: true });
  return info.exists && 'size' in info ? info.size ?? 0 : 0;
}

export async function clearCache(): Promise<void> {
  const exists = await FileSystem.getInfoAsync(CACHE_DIR);
  if (exists.exists) {
    await FileSystem.deleteAsync(CACHE_DIR, { idempotent: true });
  }
  await ensureCacheDir();
}

export async function tileExists(z: number, x: number, y: number): Promise<boolean> {
  const path = tilePath(z, x, y);
  const info = await FileSystem.getInfoAsync(path);
  return info.exists;
}

export type DownloadProgress = {
  downloaded: number;
  total: number;
  percent: number;
};

/** Approx km from delta at given latitude. */
export function deltaToRadiusKm(lat: number, latDelta: number, lonDelta: number): number {
  const latKm = latDelta * 111;
  const lonKm = lonDelta * 111 * Math.cos((lat * Math.PI) / 180);
  return Math.max(latKm, lonKm) / 2;
}

export async function evictIfNeeded(requiredBytes: number): Promise<void> {
  const current = await getCacheSizeBytes();
  if (current + requiredBytes <= MAX_CACHE_BYTES) return;
  // Simple eviction: clear oldest zoom levels (higher zoom = more detail, keep those)
  // For now we just prevent download when over limit
}

export async function downloadRegion(
  lat: number,
  lon: number,
  radiusKm: number,
  onProgress?: (p: DownloadProgress) => void
): Promise<{ downloaded: number; skipped: number; failed: number }> {
  await ensureCacheDir();
  const degPerKm = 1 / 111; // approx
  const delta = (radiusKm * degPerKm) / Math.cos((lat * Math.PI) / 180);
  const minLat = lat - delta;
  const maxLat = lat + delta;
  const minLon = lon - delta;
  const maxLon = lon + delta;

  const tiles: { z: number; x: number; y: number }[] = [];
  for (let z = MIN_ZOOM; z <= MAX_ZOOM; z++) {
    const xMin = lonToTileX(minLon, z);
    const xMax = lonToTileX(maxLon, z);
    const yMin = latToTileY(maxLat, z);
    const yMax = latToTileY(minLat, z);
    for (let x = xMin; x <= xMax; x++) {
      for (let y = yMin; y <= yMax; y++) {
        tiles.push({ z, x, y });
      }
    }
  }

  const total = tiles.length;
  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < tiles.length; i++) {
    const { z, x, y } = tiles[i];
    const path = tilePath(z, x, y);
    const exists = await FileSystem.getInfoAsync(path);
    if (exists.exists) {
      skipped++;
      downloaded++;
      onProgress?.({ downloaded: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
      continue;
    }

    const currentSize = await getCacheSizeBytes();
    if (currentSize >= MAX_CACHE_BYTES) {
      break;
    }

    try {
      const dir = `${CACHE_DIR}${z}/${x}`;
      const dirExists = await FileSystem.getInfoAsync(dir);
      if (!dirExists.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
      await FileSystem.downloadAsync(tileUrl(z, x, y), path);
      downloaded++;
    } catch {
      failed++;
    }
    onProgress?.({ downloaded: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
  }

  return { downloaded, skipped, failed };
}
