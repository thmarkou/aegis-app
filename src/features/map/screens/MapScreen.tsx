import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { tactical, tacticalStyles } from '../../../shared/tacticalStyles';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { tacticalMapStyle } from '../config/tacticalMapStyle';

const DEFAULT_REGION = {
  latitude: 37.9838,
  longitude: 23.7275,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01,
};

export function MapScreen() {
  const mapRef = useRef<MapView>(null);
  const [location, setLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [callsignLabel, setCallsignLabel] = useState('SY2EYH-7');
  const [loading, setLoading] = useState(true);

  const loadCallsign = useCallback(async () => {
    const [callsign, ssid] = await Promise.all([
      SecureSettings.getCallsign(),
      SecureSettings.getSsid(),
    ]);
    setCallsignLabel(`${callsign}-${ssid}`);
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

  const region = location
    ? {
        latitude: location.lat,
        longitude: location.lon,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }
    : DEFAULT_REGION;

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
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region}
        customMapStyle={Platform.OS === 'android' ? tacticalMapStyle : undefined}
        mapType={Platform.OS === 'ios' ? 'hybrid' : 'standard'}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {location && (
          <Marker
            coordinate={{ latitude: location.lat, longitude: location.lon }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <View style={styles.customMarker}>
              <View style={styles.markerLabel}>
                <Text style={styles.markerLabelText}>{callsignLabel}</Text>
              </View>
              <View style={styles.markerPin} />
            </View>
          </Marker>
        )}
      </MapView>

      <TouchableOpacity style={styles.recenterBtn} onPress={recenter}>
        <Ionicons name="locate" size={24} color={tactical.black} />
        <Text style={styles.recenterText}>Recenter</Text>
      </TouchableOpacity>
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
  customMarker: {
    alignItems: 'center',
  },
  markerLabel: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 4,
  },
  markerLabelText: {
    color: tactical.amber,
    fontSize: 12,
    fontWeight: '700',
  },
  markerPin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: tactical.amber,
  },
  recenterBtn: {
    position: 'absolute',
    bottom: 32,
    right: 20,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: tactical.amber,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  recenterText: {
    color: tactical.black,
    fontWeight: '700',
    fontSize: 14,
  },
});
