import axios from 'axios';
import { getResolvedUrl } from './api';

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
  const baseUrl = await getResolvedUrl();
  const res = await axios.post<HarvestYieldResponse>(
    `${baseUrl}/api/v1/harvest-yield`,
    payload,
    { timeout: 30000 },
  );
  return res.data;
}
