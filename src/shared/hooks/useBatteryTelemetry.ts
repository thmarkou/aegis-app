import { useEffect, useState, useRef } from 'react';
import * as Battery from 'expo-battery';
import { Alert } from 'react-native';
import * as SecureSettings from '../services/secureSettings';
import { tactical } from '../tacticalStyles';

const POWER_SAVE_THRESHOLD = 20;

export function useBatteryTelemetry() {
  const [level, setLevel] = useState<number | null>(null);
  const [powerSaveMode, setPowerSaveMode] = useState(false);
  const alertShownRef = useRef(false);

  useEffect(() => {
    let subscribed = true;
    (async () => {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      if (subscribed) {
        setLevel(batteryLevel);
        const pct = Math.round(batteryLevel * 100);
        if (pct < POWER_SAVE_THRESHOLD) {
          await SecureSettings.setPowerSaveMode(true);
          setPowerSaveMode(true);
          if (!alertShownRef.current) {
            alertShownRef.current = true;
            Alert.alert(
              'Power Save Mode',
              `Battery at ${pct}%. GPS updates slowed to 30s to conserve power.`,
              [{ text: 'OK' }]
            );
          }
        } else {
          await SecureSettings.setPowerSaveMode(false);
          setPowerSaveMode(false);
        }
      }
    })();

    const sub = Battery.addBatteryLevelListener(async ({ batteryLevel }) => {
      if (!subscribed) return;
      setLevel(batteryLevel);
      const pct = Math.round(batteryLevel * 100);
      if (pct < POWER_SAVE_THRESHOLD) {
        await SecureSettings.setPowerSaveMode(true);
        setPowerSaveMode(true);
        if (!alertShownRef.current) {
          alertShownRef.current = true;
          Alert.alert(
            'Power Save Mode',
            `Battery at ${pct}%. GPS updates slowed to 30s to conserve power.`,
            [{ text: 'OK' }]
          );
        }
      } else {
        await SecureSettings.setPowerSaveMode(false);
        setPowerSaveMode(false);
      }
    });

    return () => {
      subscribed = false;
      sub.remove();
    };
  }, []);

  useEffect(() => {
    SecureSettings.getPowerSaveMode().then(setPowerSaveMode);
  }, []);

  const pct = level != null ? Math.round(level * 100) : null;
  const battColor =
    pct != null ? (pct <= 20 ? '#ef4444' : tactical.amber) : tactical.zinc[500];

  return { level, pct, powerSaveMode, battColor };
}
