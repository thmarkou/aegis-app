/**
 * Fetches current weather (temp, wind) from Open-Meteo API.
 * Online only – no API key required.
 */

export type WeatherData = {
  tempC: number;
  windKmh: number;
};

export async function fetchWeatherForLocation(
  lat: number,
  lon: number
): Promise<WeatherData | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      current?: { temperature_2m?: number; wind_speed_10m?: number };
    };
    const cur = json.current;
    if (!cur || cur.temperature_2m == null || cur.wind_speed_10m == null) return null;
    return {
      tempC: Math.round(cur.temperature_2m),
      windKmh: Math.round(cur.wind_speed_10m),
    };
  } catch {
    return null;
  }
}
