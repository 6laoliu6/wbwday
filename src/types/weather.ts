export type WeatherSnapshot = {
  date: string;
  latitude: number;
  longitude: number;
  city?: string;
  temperature?: number;
  apparentTemperature?: number;
  weatherCode?: number;
  weatherLabel?: string;
  maxTemperature?: number;
  minTemperature?: number;
  precipitationProbability?: number;
  windSpeed?: number;
  fetchedAt: string;
};
