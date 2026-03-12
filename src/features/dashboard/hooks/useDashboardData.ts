import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { Pedometer } from 'expo-sensors';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../../../database';
import type InventoryItem from '../../../database/models/InventoryItem';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { haversineKm, bearingDeg } from '../../../shared/utils/geoUtils';
import { fetchWeatherForLocation } from '../services/weatherService';

const MISSION_KEYS = [
  'missionCheck_radiosCharged',
  'missionCheck_antennaTuned',
  'missionCheck_cablesConnected',
  'missionCheck_offlineMapsVerified',
  'missionCheck_emergencyRations',
] as const;

const EXPIRY_WARN_DAYS = 30;

export function useDashboardData() {
  const [readinessScore, setReadinessScore] = useState(0);
  const [totalWeightKg, setTotalWeightKg] = useState(0);
  const [batteryPct, setBatteryPct] = useState<number | null>(null);
  const [expAlerts, setExpAlerts] = useState(0);
  const [nextWp, setNextWp] = useState<{ km: number; bearing: number; name: string } | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number; alt?: number } | null>(null);
  const [altitudeM, setAltitudeM] = useState<number | null>(null);
  const [stepsToday, setStepsToday] = useState<number | null>(null);
  const [distWalkedKm, setDistWalkedKm] = useState<number | null>(null);
  const [weather, setWeather] = useState<{ tempC: number; windKmh: number } | null>(null);

  const load = useCallback(async () => {
    const now = Date.now();
    const warnThreshold = now + EXPIRY_WARN_DAYS * 24 * 60 * 60 * 1000;

    const items = await database
      .get<InventoryItem>('inventory_items')
      .query()
      .fetch();

    let missionChecksDone = 0;
    for (const key of MISSION_KEYS) {
      if (await SecureSettings.getMissionCheck(key)) missionChecksDone++;
    }

    // Readiness = % of Mission Prep checklist items checked (linked to MISSION tab)
    const missionPct = (missionChecksDone / MISSION_KEYS.length) * 100;
    setReadinessScore(missionPct);

    const totalGrams = items.reduce((sum, i) => sum + i.quantity * i.weightGrams, 0);
    setTotalWeightKg(totalGrams / 1000);

    const batt = await Battery.getBatteryLevelAsync();
    setBatteryPct(Math.round(batt * 100));

    let expCount = 0;
    for (const item of items) {
      if (item.expiryDate) {
        const exp = item.expiryDate;
        if (exp <= now) expCount++;
        else if (exp <= warnThreshold) expCount++;
      }
    }
    setExpAlerts(expCount);

    const waypoints = items.filter(
      (i) =>
        (i.category === 'Base Camp' || i.category === 'Vehicle') &&
        i.latitude != null &&
        i.longitude != null
    );

    let loc: { lat: number; lon: number; alt?: number } | null = null;
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const alt = pos.coords.altitude ?? undefined;
        loc = { lat: pos.coords.latitude, lon: pos.coords.longitude, alt };
        setLocation(loc);
        if (alt != null && !isNaN(alt)) setAltitudeM(Math.round(alt));
      }
    } catch {
      // ignore
    }

    if (loc && waypoints.length > 0) {
      let nearest: { km: number; bearing: number; name: string } | null = null;
      for (const w of waypoints) {
        const km = haversineKm(loc.lat, loc.lon, w.latitude!, w.longitude!);
        const bearing = bearingDeg(loc.lat, loc.lon, w.latitude!, w.longitude!);
        if (!nearest || km < nearest.km) {
          nearest = { km, bearing, name: w.name };
        }
      }
      setNextWp(nearest);
    } else {
      setNextWp(null);
    }

    const netState = await NetInfo.fetch();
    if (netState.isConnected && netState.isInternetReachable && loc) {
      const w = await fetchWeatherForLocation(loc.lat, loc.lon);
      setWeather(w);
    } else {
      setWeather(null);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    try {
      const avail = await Pedometer.isAvailableAsync();
      if (avail) {
        const result = await Pedometer.getStepCountAsync(today, new Date());
        if (result?.steps != null) {
          setStepsToday(result.steps);
          setDistWalkedKm(Math.round(result.steps * 0.00075 * 100) / 100);
        }
      }
    } catch {
      setStepsToday(null);
      setDistWalkedKm(null);
    }
  }, []);

  useEffect(() => {
    load().catch(() => {
      // Pedometer/native module errors are caught inside load; this guards any escape
    });
    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      setBatteryPct(Math.round(batteryLevel * 100));
    });
    return () => sub.remove();
  }, [load]);

  return {
    readinessScore,
    totalWeightKg,
    batteryPct,
    expAlerts,
    nextWp,
    location,
    altitudeM,
    stepsToday,
    distWalkedKm,
    weather,
    refresh: load,
  };
}
