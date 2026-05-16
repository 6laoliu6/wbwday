import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';

import { STORAGE_KEYS } from '@/storage/storageKeys';
import type { WeatherSnapshot } from '@/types';
import { nowIso, toDateKey } from '@/utils/date';

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    apparent_temperature?: number;
    weather_code?: number;
    wind_speed_10m?: number;
  };
  daily?: {
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    precipitation_probability_max?: number[];
    weather_code?: number[];
  };
};

export async function requestLocationPermission(): Promise<Location.LocationPermissionResponse> {
  return Location.requestForegroundPermissionsAsync();
}

export async function getLocationPermission(): Promise<Location.LocationPermissionResponse> {
  return Location.getForegroundPermissionsAsync();
}

export async function getCurrentLocation(): Promise<Location.LocationObject> {
  const lastKnownLocation = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 30,
    requiredAccuracy: 5000,
  });

  if (lastKnownLocation) return lastKnownLocation;

  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
}

export function mapWeatherCodeToLabel(code?: number): string {
  if (code === undefined) return '天气普通';
  if (code === 0) return '晴';
  if ([1, 2].includes(code)) return '多云';
  if (code === 3) return '阴';
  if ([45, 48].includes(code)) return '有雾';
  if ([51, 53, 55, 56, 57].includes(code)) return '毛毛雨';
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return '下雨';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '下雪';
  if ([95, 96, 99].includes(code)) return '雷雨';
  return '天气普通';
}

export function getWeatherSuggestion(snapshot?: WeatherSnapshot): string {
  if (!snapshot) return '天气暂时不可用，先稳稳推进今天最重要的事。';
  if ((snapshot.precipitationProbability ?? 0) >= 50 || [61, 63, 65, 80, 81, 82].includes(snapshot.weatherCode ?? -1)) {
    return '今天可能有雨，出门前记得看一眼。';
  }
  if ([0, 1, 2].includes(snapshot.weatherCode ?? -1)) {
    return '天气不错，适合把重要的事放在上午。';
  }
  return '天气普通，但今天也可以稳稳推进。';
}

export async function fetchWeatherByCoords(latitude: number, longitude: number): Promise<WeatherSnapshot> {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
  url.searchParams.set('daily', 'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`WEATHER_REQUEST_FAILED_${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const weatherCode = data.current?.weather_code ?? data.daily?.weather_code?.[0];

  return {
    date: toDateKey(),
    latitude,
    longitude,
    temperature: data.current?.temperature_2m,
    apparentTemperature: data.current?.apparent_temperature,
    weatherCode,
    weatherLabel: mapWeatherCodeToLabel(weatherCode),
    maxTemperature: data.daily?.temperature_2m_max?.[0],
    minTemperature: data.daily?.temperature_2m_min?.[0],
    precipitationProbability: data.daily?.precipitation_probability_max?.[0],
    windSpeed: data.current?.wind_speed_10m,
    fetchedAt: nowIso(),
  };
}

export async function getCachedWeather(): Promise<WeatherSnapshot | undefined> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.weatherSnapshot);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw) as WeatherSnapshot;
    return parsed?.fetchedAt ? parsed : undefined;
  } catch {
    return undefined;
  }
}

export async function saveCachedWeather(snapshot: WeatherSnapshot): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.weatherSnapshot, JSON.stringify(snapshot));
}

export async function getWeatherPermissionPrompted(): Promise<boolean> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.weatherPermissionPrompted)) === 'true';
}

export async function saveWeatherPermissionPrompted(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.weatherPermissionPrompted, 'true');
}
