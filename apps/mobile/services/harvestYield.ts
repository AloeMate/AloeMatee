import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Derive the local backend URL.
 * Priority:
 *  1. EXPO_PUBLIC_API_URL env variable (set in apps/mobile/.env)
 *  2. Expo hostUri (extracts the PC's LAN IP from the dev-server address)
 *  3. Fallback to localhost (only works on Android emulator / iOS Simulator)
 */
function getLocalBackendUrl(): string {
  // 1. Explicit env var (most reliable for physical devices)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  // 2. Parse PC LAN IP from Expo dev-server hostUri
  const hostUri: string | undefined =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants.manifest2 as any)?.extra?.expoClient?.hostUri ??
    (Constants as any).manifest?.debuggerHost;
  if (hostUri) {
    // hostUri is like "192.168.8.194:8081" — strip the port to get the IP
    const host = hostUri.split(':')[0];
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:8000`;
    }
  }

  return 'http://localhost:8000';
}

export type HarvestYieldRequest = {
  region: string;
  soilType: string;
  irrigationType: string;
  irrigationPerWeek: number;
  fertilizerType: string;
  fertilizerKgPerMonth: number;
  diseaseSeverity: number;
  plantCount: number;
  avgPlantAgeMonths: number;
  farmAreaHa?: number;
};

export type HarvestYieldResponse = {
  success: boolean;
  predictedHarvestKg: number;
  modelVersion: string;
  usedWeather: {
    temperatureC: number;
    humidityPct: number;
    rainfallMm: number;
  };
  weatherSource: 'live' | 'mock';
};

export async function predictHarvestYield(
  payload: HarvestYieldRequest,
): Promise<HarvestYieldResponse> {
  const baseUrl = getLocalBackendUrl();
  const res = await axios.post<HarvestYieldResponse>(
    `${baseUrl}/api/v1/harvest-yield`,
    payload,
    { timeout: 30000 },
  );
  return res.data;
}
