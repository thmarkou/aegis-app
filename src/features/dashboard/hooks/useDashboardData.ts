import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { Pedometer } from 'expo-sensors';
import NetInfo from '@react-native-community/netinfo';
import { Q } from '@nozbe/watermelondb';
import { database } from '../../../database';
import type PowerDevice from '../../../database/models/PowerDevice';
import type KitPackItem from '../../../database/models/KitPackItem';
import type InventoryPoolItem from '../../../database/models/InventoryPoolItem';
import type MissionPreset from '../../../database/models/MissionPreset';
import * as SecureSettings from '../../../shared/services/secureSettings';
import { haversineKm, bearingDeg } from '../../../shared/utils/geoUtils';
import { fetchWeatherForLocation } from '../services/weatherService';
import { PROACTIVE_EXPIRY_DAYS } from '../../../services/inventoryAprsStatus';
import { getStalePowerDeviceCount } from '../../../services/powerLogisticsStatus';
import { poolItemNeedsBatteryAttention } from '../../../services/batteryInventoryReview';
import { computeKitNutritionTotals } from '../../../services/missionReadiness';

const EXPIRY_WARN_DAYS = 30;

/** 0–100 readiness from active kit vs selected mission preset (calories + water targets). */
function readinessPercentForActiveKit(
  preset: MissionPreset,
  totals: Awaited<ReturnType<typeof computeKitNutritionTotals>>
): number {
  const targetKcal = preset.durationDays * preset.caloriesPerDay;
  const targetWater = preset.durationDays * preset.waterLitersPerDay;
  const kcalRatio = targetKcal > 0 ? Math.min(1, totals.totalKcal / targetKcal) : 1;
  const waterRatio = targetWater > 0 ? Math.min(1, totals.totalWaterLiters / targetWater) : 1;
  return Math.round(((kcalRatio + waterRatio) / 2) * 100);
}

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
  const [maintenanceExpiringSoon, setMaintenanceExpiringSoon] = useState(0);
  const [maintenanceStalePower, setMaintenanceStalePower] = useState(0);
  const [batteryReviewDueCount, setBatteryReviewDueCount] = useState(0);

  const load = useCallback(async () => {
    const now = Date.now();
    const warnThreshold = now + EXPIRY_WARN_DAYS * 24 * 60 * 60 * 1000;

    const activeKitId = await SecureSettings.getActiveKitId();
    const presetId = await SecureSettings.getSelectedMissionPresetId();

    let readiness = 0;
    if (activeKitId && presetId) {
      try {
        const preset = await database.get<MissionPreset>('mission_presets').find(presetId);
        const totals = await computeKitNutritionTotals(activeKitId);
        readiness = readinessPercentForActiveKit(preset, totals);
      } catch {
        readiness = 0;
      }
    }
    setReadinessScore(readiness);

    let totalGrams = 0;
    if (activeKitId) {
      const packs = await database
        .get<KitPackItem>('kit_pack_items')
        .query(Q.where('kit_id', activeKitId))
        .fetch();
      for (const p of packs) {
        const pool: InventoryPoolItem = await p.poolItem.fetch();
        totalGrams += p.quantity * pool.weightGrams;
      }
    }
    setTotalWeightKg(totalGrams / 1000);

    const batt = await Battery.getBatteryLevelAsync();
    setBatteryPct(Math.round(batt * 100));

    let expCount = 0;
    const thirtyHorizon = now + PROACTIVE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    let expiringSoon = 0;
    const poolItems = await database.get<InventoryPoolItem>('inventory_pool_items').query().fetch();
    const maintMonths = await SecureSettings.getMaintenanceAlertThresholdMonths();
    let batteryDue = 0;
    for (const item of poolItems) {
      if (poolItemNeedsBatteryAttention(item, maintMonths, now)) batteryDue++;
    }
    setBatteryReviewDueCount(batteryDue);
    for (const item of poolItems) {
      if (item.expiryDate) {
        const exp = item.expiryDate;
        if (exp <= now) expCount++;
        else if (exp <= warnThreshold) expCount++;
        if (exp > now && exp <= thirtyHorizon) expiringSoon++;
      }
    }
    setExpAlerts(expCount);
    setMaintenanceExpiringSoon(expiringSoon);
    setMaintenanceStalePower(await getStalePowerDeviceCount());

    const waypoints = poolItems.filter(
      (i) => i.isWaypoint && i.latitude != null && i.longitude != null
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

  // STALE count updates when charge dates or devices change (Logistics) without leaving Dashboard.
  useEffect(() => {
    const sub = database
      .get<PowerDevice>('power_devices')
      .query()
      .observe()
      .subscribe(() => {
        void getStalePowerDeviceCount().then(setMaintenanceStalePower);
      });
    return () => sub.unsubscribe();
  }, []);

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
    maintenanceExpiringSoon,
    maintenanceStalePower,
    batteryReviewDueCount,
    refresh: load,
  };
}
