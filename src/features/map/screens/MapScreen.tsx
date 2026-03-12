import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { EmergencyStationMarker } from '../components/EmergencyStationMarker';
import { useRoute, useFocusEffect, useNavigation } from '@react-navigation/native';
import MapView, { Marker, Callout, UrlTile, LocalTile } from 'react-native-maps';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { tacticalMapStyle } from '../config/tacticalMapStyle';
import {
  getLocalTilePathTemplate,
  getRemoteTileUrlTemplate,
  downloadRegion,
  deltaToRadiusKm,
} from '../services/TileCacheService';
import { database } from '../../../database';
import type IncomingStation from '../../../database/models/IncomingStation';
import { Q } from '@nozbe/watermelondb';
import { getCategoryIcon } from '../utils/categoryIcons';
import { useBatteryTelemetry } from '../../../shared/hooks/useBatteryTelemetry';
import { BatteryTelemetry } from '../../../shared/components/BatteryTelemetry';
import { useAppStore } from '../../../shared/store/useAppStore';

function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function bearingDeg(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
  const x =
    Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
    Math.sin((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

const DEFAULT_REGION = {
  latitude: 37.9838,
  longitude: 23.7275,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

const TACTICAL_RADIUS_KM = 5;
const MAX_ZOOM = 18;
const MIN_ZOOM = 10;

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [callsignLabel, setCallsignLabel] = useState('SY2EYH-7');
  const [ourIdentity, setOurIdentity] = useState<{ callsign: string; ssid: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [repeaters, setRepeaters] = useState<{ id: string; name: string; lat: number; lon: number }[]>([]);
  const [incomingStations, setIncomingStations] = useState<
    { id: string; callsign: string; ssid: number; lat: number; lon: number; lastSeenAt: number; comment: string | null }[]
  >([]);
  const stationMarkerRefs = useRef<Record<string, React.Component | null>>({});
  const prevStationCountRef = useRef(0);
  const [inventoryWaypoints, setInventoryWaypoints] = useState<
    { id: string; name: string; category: string; lat: number; lon: number }[]
  >([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const autoCacheRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const route = useRoute<{
    params?: { focusItemId?: string; focusOnNewStation?: boolean; centerOnUser?: boolean };
  }>();
  const navigation = useNavigation();
  const { pct: batteryPct, battColor, powerSaveMode } = useBatteryTelemetry();
  const isGlobalEmergency = useAppStore((s) => s.isGlobalEmergency);
  const mapRefreshTrigger = useAppStore((s) => s.mapRefreshTrigger);

  const centerOnNewestStation = useCallback(
    (openCallout = true) => {
      if (incomingStations.length === 0 || !mapRef.current) return;
      const newest = incomingStations[0];
      const region = {
        latitude: newest.lat,
        longitude: newest.lon,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };
      mapRef.current.animateToRegion(region, 500);
      if (openCallout) {
        setTimeout(() => {
          const ref = stationMarkerRefs.current[newest.id];
          if (ref && typeof (ref as { showCallout?: () => void }).showCallout === 'function') {
            (ref as { showCallout: () => void }).showCallout();
          }
        }, 600);
      }
    },
    [incomingStations]
  );

  const loadCallsign = useCallback(async () => {
    const [callsign, ssid] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
    ]);
    setCallsignLabel(`${callsign}-${ssid}`);
    setOurIdentity({ callsign, ssid });
  }, []);

  const requestLocation = useCallback(async () => {
    setLocationError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocationError('Location permission denied');
      setLoading(false);
      return;
    }
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: loc.coords.latitude,
        lon: loc.coords.longitude,
      });
    } catch (e) {
      setLocationError(e instanceof Error ? e.message : 'Location failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCallsign();
  }, [loadCallsign]);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  useEffect(() => {
    const intervalMs = powerSaveMode
      ? SecureSettings.GPS_UPDATE_INTERVAL_POWER_SAVE_MS
      : SecureSettings.GPS_UPDATE_INTERVAL_NORMAL_MS;
    const id = setInterval(requestLocation, intervalMs);
    return () => clearInterval(id);
  }, [requestLocation, powerSaveMode]);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const loadRepeaters = async () => {
      const rows = await database.get('repeaters').query(Q.where('is_active', true)).fetch();
      setRepeaters(
        rows.map((r) => ({
          id: r.id,
          name: r.name ?? r.callsign ?? 'Repeater',
          lat: r.latitude,
          lon: r.longitude,
        }))
      );
    };
    loadRepeaters();
  }, []);

  const loadIncomingStations = useCallback(async () => {
    const rows = await database.get<IncomingStation>('incoming_stations').query().fetch();
    const stations = rows
      .map((r) => ({
        id: r.id,
        callsign: r.callsign,
        ssid: r.ssid,
        lat: r.latitude,
        lon: r.longitude,
        lastSeenAt: r.lastSeenAt,
        comment: r.comment,
      }))
      .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
    setIncomingStations(stations);
  }, []);

  // Reactive: map updates when incoming_stations DB changes (e.g. after Loopback Test)
  useEffect(() => {
    const collection = database.get<IncomingStation>('incoming_stations');
    const subscription = collection.query().observe().subscribe((rows) => {
      const stations = rows
        .map((r) => ({
          id: r.id,
          callsign: r.callsign,
          ssid: r.ssid,
          lat: r.latitude,
          lon: r.longitude,
          lastSeenAt: r.lastSeenAt,
          comment: r.comment,
        }))
        .sort((a, b) => b.lastSeenAt - a.lastSeenAt);
      setIncomingStations(stations);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadIncomingStations();
  }, [mapRefreshTrigger, loadIncomingStations]);

  const handleClearAllStations = useCallback(async () => {
    try {
      await database.write(async () => {
        const collection = database.get<IncomingStation>('incoming_stations');
        const all = await collection.query().fetch();
        for (const record of all) {
          await record.destroyPermanently();
        }
      });
      await loadIncomingStations();
      Alert.alert('Cleared', 'All incoming stations removed. Run Loopback Test in Comms to add Acropolis marker.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to clear stations');
    }
  }, [loadIncomingStations]);

  const loadInventoryWaypoints = useCallback(async () => {
    const rows = await database.get('inventory_items').query().fetch();
    const waypoints = rows
      .filter((r) => r.latitude != null && r.longitude != null)
      .map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        lat: r.latitude!,
        lon: r.longitude!,
      }));
    setInventoryWaypoints(waypoints);
    return waypoints;
  }, []);

  useEffect(() => {
    loadInventoryWaypoints();
  }, [loadInventoryWaypoints]);

  // Auto-center when navigating from Comms after Loopback Test (wait for stations + map render)
  useEffect(() => {
    if (route.params?.focusOnNewStation && incomingStations.length > 0) {
      const t = setTimeout(() => {
        centerOnNewestStation(true);
        navigation.setParams({ focusOnNewStation: false } as never);
      }, 300);
      return () => clearTimeout(t);
    }
  }, [route.params?.focusOnNewStation, incomingStations.length, centerOnNewestStation, navigation]);

  // Auto-center when new station added while Map is visible (skip initial load 0->N)
  useEffect(() => {
    const prev = prevStationCountRef.current;
    prevStationCountRef.current = incomingStations.length;
    if (prev > 0 && incomingStations.length > prev) {
      centerOnNewestStation(true);
    }
  }, [incomingStations.length, centerOnNewestStation]);

  // Center on user when navigating from Emergency Broadcast
  useEffect(() => {
    if (route.params?.centerOnUser && location && mapRef.current) {
      recenter();
      navigation.setParams({ centerOnUser: false } as never);
    }
  }, [route.params?.centerOnUser, location, recenter, navigation]);

  useFocusEffect(
    useCallback(() => {
      // Stations load reactively via observe(); only waypoints/focus here
      const focusId = route.params?.focusItemId;
      loadInventoryWaypoints().then((waypoints) => {
        if (focusId) {
          setSelectedItemId(focusId);
          const item = waypoints.find((w) => w.id === focusId);
          if (item && mapRef.current) {
            setTimeout(() => {
              mapRef.current?.animateToRegion(
                { latitude: item.lat, longitude: item.lon, latitudeDelta: 0.005, longitudeDelta: 0.005 },
                500
              );
            }, 300);
          }
        }
      });
    }, [route.params?.focusItemId, loadInventoryWaypoints])
  );

  const recenter = useCallback(() => {
    if (!location || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  }, [location]);

  const handleRegionChangeComplete = useCallback(
    (reg: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }) => {
      if (isOffline) return;
      autoCacheRef.current && clearTimeout(autoCacheRef.current);
      autoCacheRef.current = setTimeout(() => {
        const radiusKm = deltaToRadiusKm(
          reg.latitude,
          reg.latitudeDelta,
          reg.longitudeDelta
        );
        downloadRegion(reg.latitude, reg.longitude, Math.min(radiusKm, 2)).catch(() => {});
      }, 2000);
    },
    [isOffline]
  );

  const handleTacticalDownload = useCallback(async () => {
    if (!location) return;
    if (isOffline) {
      Alert.alert('Offline', 'Connect to internet to download tiles.');
      return;
    }
    setDownloadProgress(0);
    try {
      const result = await downloadRegion(
        location.lat,
        location.lon,
        TACTICAL_RADIUS_KM,
        (p) => setDownloadProgress(p.percent)
      );
      setDownloadProgress(null);
      Alert.alert(
        'Tactical Download',
        `Downloaded: ${result.downloaded}, Skipped: ${result.skipped}, Failed: ${result.failed}`
      );
    } catch (e) {
      setDownloadProgress(null);
      Alert.alert('Error', e instanceof Error ? e.message : 'Download failed');
    }
  }, [location, isOffline]);

  const region = location
    ? {
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

  const tileUrlTemplate = getRemoteTileUrlTemplate();
  const localPathTemplate = getLocalTilePathTemplate();

  if (loading) {
    return (
      <View style={styles.centerScreen}>
        <ActivityIndicator size="large" color={tactical.amber} />
        <Text style={tacticalStyles.subtext}>Getting location...</Text>
      </View>
    );
  }

  if (locationError) {
    return (
      <View style={styles.centerScreen}>
        <Text style={tacticalStyles.titleAmber}>Location Required</Text>
        <Text style={tacticalStyles.subtext}>{locationError}</Text>
        <TouchableOpacity style={tacticalStyles.btnPrimary} onPress={requestLocation}>
          <Text style={tacticalStyles.btnPrimaryText}>Grant Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.batteryTelemetry}>
        <BatteryTelemetry pct={batteryPct} battColor={battColor} />
      </View>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        customMapStyle={Platform.OS === 'android' ? tacticalMapStyle : undefined}
        mapType="standard"
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={false}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {isOffline ? (
          <LocalTile
            pathTemplate={localPathTemplate}
            tileSize={256}
            zIndex={1}
            minimumZ={MIN_ZOOM}
            maximumZ={MAX_ZOOM}
          />
        ) : (
          <UrlTile
            urlTemplate={tileUrlTemplate}
            zIndex={1}
            minimumZ={MIN_ZOOM}
            maximumZ={MAX_ZOOM}
          />
        )}
        {/* User location = native blue dot (showsUserLocation). Station markers = red pins. */}
        {repeaters.map((r) => (
          <Marker
            key={`r-${r.id}`}
            coordinate={{ latitude: r.lat, longitude: r.lon }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            zIndex={5}
          >
            <View style={styles.waypointMarker}>
              <Text style={styles.waypointText}>{r.name}</Text>
              <View style={styles.waypointPin} />
            </View>
          </Marker>
        ))}
        {(() => {
          const effectiveStations = [...incomingStations];
          if (
            isGlobalEmergency &&
            ourIdentity != null &&
            location != null &&
            !effectiveStations.some(
              (s) => s.callsign === ourIdentity!.callsign && s.ssid === ourIdentity!.ssid
            )
          ) {
            effectiveStations.unshift({
              id: 'self-emergency',
              callsign: ourIdentity.callsign,
              ssid: ourIdentity.ssid,
              lat: location.lat,
              lon: location.lon,
              lastSeenAt: Date.now(),
              comment: 'EMERGENCY!',
            });
          }
          return effectiveStations.map((s) => {
            const isEmergency = (s.comment ?? '').toUpperCase().includes('EMERGENCY');
            const isOwnStation =
              ourIdentity != null && s.callsign === ourIdentity.callsign && s.ssid === ourIdentity.ssid;
            const showRadar = isEmergency || (isOwnStation && isGlobalEmergency);
            const shouldPulse = isOwnStation ? showRadar && isGlobalEmergency : isEmergency;
            return (
              <Marker
                key={`in-${s.id}`}
                ref={(ref) => {
                  stationMarkerRefs.current[s.id] = ref;
                }}
                coordinate={{ latitude: s.lat, longitude: s.lon }}
                anchor={{ x: 0.5, y: 1 }}
                tracksViewChanges={false}
                zIndex={showRadar ? 999999 : 5}
              >
                {showRadar ? (
                  <EmergencyStationMarker station={s} shouldPulse={shouldPulse} />
                ) : (
                <>
                  <View style={styles.incomingStationMarker}>
                    <Text style={styles.incomingStationText}>{s.callsign}-{s.ssid}</Text>
                    <View style={styles.incomingStationPin} />
                  </View>
                  <Callout>
                    <View style={styles.calloutContent}>
                      <Text style={styles.calloutTitle}>{s.callsign}-{s.ssid}</Text>
                      <Text style={styles.calloutCoords}>Lat: {s.lat.toFixed(5)}</Text>
                      <Text style={styles.calloutCoords}>Lon: {s.lon.toFixed(5)}</Text>
                    </View>
                  </Callout>
                </>
              )}
            </Marker>
            );
          });
        })()}
        {inventoryWaypoints.map((w) => {
          const icon = getCategoryIcon(w.category, w.name);
          const isSelected = selectedItemId === w.id;
          return (
            <Marker
              key={`i-${w.id}`}
              coordinate={{ latitude: w.lat, longitude: w.lon }}
              anchor={{ x: 0.5, y: 1 }}
              tracksViewChanges={false}
              zIndex={isSelected ? 15 : 6}
              onPress={() => setSelectedItemId(isSelected ? null : w.id)}
            >
              <View style={[styles.waypointMarker, isSelected && styles.waypointMarkerSelected]}>
                <View style={styles.inventoryIcon}>
                  <Ionicons name={icon} size={14} color={tactical.amber} />
                </View>
                <Text style={styles.waypointText}>{w.name}</Text>
                <View style={[styles.waypointPin, isSelected && styles.waypointPinSelected]} />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {selectedItemId && location && (() => {
        const item = inventoryWaypoints.find((w) => w.id === selectedItemId);
        if (!item) return null;
        const km = haversineKm(location.lat, location.lon, item.lat, item.lon);
        const deg = Math.round(bearingDeg(location.lat, location.lon, item.lat, item.lon));
        const dirs = ['N','NE','E','SE','S','SW','W','NW'];
        const dir = dirs[Math.round(deg / 45) % 8];
        return (
          <View style={styles.distanceCard}>
            <Text style={styles.distanceTitle}>{item.name}</Text>
            <Text style={styles.distanceText}>{km.toFixed(2)} km · {deg}° {dir}</Text>
            <TouchableOpacity onPress={() => setSelectedItemId(null)} style={styles.distanceClose}>
              <Ionicons name="close" size={18} color={tactical.amber} />
            </TouchableOpacity>
          </View>
        );
      })()}

      {isOffline && (
        <View style={styles.offlineBadge}>
          <Ionicons name="cloud-offline" size={16} color={tactical.amber} />
          <Text style={styles.offlineText}>Offline</Text>
        </View>
      )}

      {downloadProgress !== null && (
        <View style={styles.progressOverlay}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${downloadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{downloadProgress}%</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.tacticalBtn, isOffline && styles.tacticalBtnDisabled]}
          onPress={handleTacticalDownload}
          disabled={isOffline || downloadProgress !== null}
        >
          <Ionicons name="download" size={20} color={tactical.black} />
          <Text style={styles.tacticalBtnText}>Tactical Download</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearStationsBtn} onPress={handleClearAllStations}>
          <Text style={styles.clearStationsText}>[CLEAR_ALL_STATIONS]</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recenterBtn} onPress={() => loadIncomingStations()}>
          <Ionicons name="refresh" size={20} color={tactical.black} />
          <Text style={styles.recenterText}>Refresh Stations</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.recenterBtn, incomingStations.length === 0 && styles.recenterBtnDisabled]}
          onPress={() => centerOnNewestStation(true)}
          disabled={incomingStations.length === 0}
        >
          <Ionicons name="navigate" size={20} color={tactical.black} />
          <Text style={styles.recenterText}>Center on Station</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
          <Ionicons name="locate" size={24} color={tactical.black} />
          <Text style={styles.recenterText}>Recenter</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tactical.black },
  map: { flex: 1, width: '100%', height: '100%' },
  centerScreen: {
    flex: 1,
    backgroundColor: tactical.black,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  customMarker: { alignItems: 'center' },
  markerLabel: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  markerLabelText: { color: tactical.amber, fontSize: 12, fontWeight: '700' },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tactical.amber,
  },
  incomingStationMarker: { alignItems: 'center' },
  incomingStationText: {
    color: '#ef4444',
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 2,
  },
  incomingStationPin: {
    width: 12,
    height: 12,
    backgroundColor: '#ef4444',
    borderRadius: 6,
    transform: [{ translateY: -6 }],
  },
  calloutContent: {
    padding: 8,
    minWidth: 140,
  },
  calloutTitle: {
    color: tactical.amber,
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 4,
  },
  calloutCoords: {
    color: tactical.zinc[400],
    fontSize: 12,
  },
  waypointMarker: { alignItems: 'center' },
  waypointText: {
    color: tactical.zinc[400],
    fontSize: 10,
    marginBottom: 4,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  waypointPin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: tactical.zinc[500],
  },
  waypointMarkerSelected: { borderWidth: 2, borderColor: tactical.amber, borderRadius: 8, padding: 4 },
  waypointPinSelected: { backgroundColor: tactical.amber },
  inventoryIcon: {
    marginBottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceCard: {
    position: 'absolute',
    bottom: 120,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  distanceTitle: { color: tactical.amber, fontWeight: '700', fontSize: 16, marginBottom: 4 },
  distanceText: { color: tactical.zinc[400], fontSize: 14 },
  distanceClose: { position: 'absolute', top: 12, right: 12 },
  offlineBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  offlineText: { color: tactical.amber, fontWeight: '600', fontSize: 14 },
  batteryTelemetry: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: tactical.zinc[700],
  },
  progressOverlay: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tactical.amber,
  },
  progressBar: {
    height: 8,
    backgroundColor: tactical.zinc[700],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: tactical.amber,
  },
  progressText: { color: tactical.amber, textAlign: 'center', fontWeight: '600' },
  controls: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    gap: 12,
    alignItems: 'flex-end',
  },
  tacticalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tactical.amber,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  tacticalBtnDisabled: { opacity: 0.5 },
  recenterBtnDisabled: { opacity: 0.5 },
  tacticalBtnText: { color: tactical.black, fontWeight: '700', fontSize: 14 },
  recenterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tactical.amber,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recenterText: { color: tactical.black, fontWeight: '700', fontSize: 14 },
  clearStationsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
  },
  clearStationsText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
});
