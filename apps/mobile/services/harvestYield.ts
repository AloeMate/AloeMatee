/**
 * Harvest Yield Prediction API client
 * Calls POST /harvest/yield-predict on the AloeMatee FastAPI backend.
 */
import { API_BASE_URL } from '../config';

export interface HarvestYieldRequest {
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
}

export interface WeatherData {
  temperatureC: number;
  humidityPct: number;
  rainfallMm: number;
  source: string;
}

export interface HarvestYieldResponse {
  predictedHarvestKg: number;
  modelVersion: string;
  usedWeather: WeatherData;
}

export async function predictHarvestYield(
  payload: HarvestYieldRequest
): Promise<HarvestYieldResponse> {
  const url = `${API_BASE_URL}/harvest/yield-predict`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `Server error (${response.status}): ${response.statusText}`
    );
  }

  return response.json() as Promise<HarvestYieldResponse>;
}
