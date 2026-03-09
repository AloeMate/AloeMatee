import { Platform } from 'react-native';
import Constants from 'expo-constants';

const AWS_URL    = 'https://vnfzwebnxd.ap-south-1.awsapprunner.com';
const RENDER_URL = 'https://aloe-mate-app-backend.onrender.com';
const LOCAL_URL  = 'http://localhost:8000';

function getBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl;

  const extraApiUrl =
    (Constants.expoConfig as any)?.extra?.apiUrl ??
    (Constants.manifest2 as any)?.extra?.apiUrl ??
    (Constants as any).manifest?.extra?.apiUrl;

  if (extraApiUrl) return extraApiUrl;

  const hostUri: string | undefined =
    (Constants.expoConfig as any)?.hostUri ??
    (Constants.manifest2 as any)?.extra?.expoClient?.hostUri ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const host = hostUri.split(':')[0];
    return `http://${host}:8000`;
  }

  return LOCAL_URL;
}

async function resolveBaseUrl(): Promise<string> {
  for (const url of [AWS_URL, RENDER_URL, getBaseUrl()]) {
    try {
      const res = await fetch(`${url}/health`, { method: 'GET' });
      if (res.ok) return url;
    } catch {
      // try next
    }
  }
  return LOCAL_URL;
}

let _resolvedUrl: string | null = null;

export async function getResolvedUrl(): Promise<string> {
  if (!_resolvedUrl) {
    _resolvedUrl = await resolveBaseUrl();
  }
  return _resolvedUrl;
}

export interface ROI {
  x: number;
  y: number;
  r: number;
}

export interface ModelResult {
  predicted_class: string;
  confidence: number;
  [key: string]: unknown;
}

export interface GeoResult extends ModelResult {
  detected_area: number;
}

export interface EnsembleResult extends ModelResult {
  decision_reason: string;
  low_confidence: boolean;
}

export interface PredictMaturityResponse {
  ensemble_prediction: EnsembleResult;
  cnn_model: ModelResult;
  geo_algorithm: GeoResult;
}

interface FastAPIValidationError {
  detail: Array<{ loc: string[]; msg: string; type: string }> | string;
}

function parseFastAPIError(body: string): string {
  try {
    const parsed: FastAPIValidationError = JSON.parse(body);
    if (typeof parsed.detail === 'string') return parsed.detail;
    if (Array.isArray(parsed.detail)) {
      return parsed.detail.map((e) => `${e.loc.join('.')}: ${e.msg}`).join('\n');
    }
  } catch {
    // not JSON
  }
  return body;
}

export async function predictMaturity(
  cnnImageUri: string,
  geoImageUri: string,
  roi: ROI,
  plantAge: number,
): Promise<PredictMaturityResponse> {
  const BASE_URL = await getResolvedUrl();

  const form = new FormData();

  if (Platform.OS === 'web') {
    const cnnResponse = await fetch(cnnImageUri);
    const cnnBlob = await cnnResponse.blob();

    const geoResponse = await fetch(geoImageUri);
    const geoBlob = await geoResponse.blob();

    form.append('cnn_image', new File([cnnBlob], 'cnn_image.jpg', { type: 'image/jpeg' }));
    form.append('geo_image', new File([geoBlob], 'geo_image.jpg', { type: 'image/jpeg' }));
  } else {
    form.append(
      'cnn_image',
      { uri: cnnImageUri, name: 'cnn_image.jpg', type: 'image/jpeg' } as any
    );
    form.append(
      'geo_image',
      { uri: geoImageUri, name: 'geo_image.jpg', type: 'image/jpeg' } as any
    );
  }

  form.append('roi_x', String(roi.x));
  form.append('roi_y', String(roi.y));
  form.append('roi_r', String(roi.r));
  form.append('plant_age', String(plantAge));

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/predict`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
      body: form,
    });
  } catch (networkErr) {
    throw new Error(`Network error – is the FastAPI server running at ${BASE_URL}?\n${networkErr}`);
  }

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch {
      // ignore
    }
    throw new Error(`FastAPI error ${response.status}: ${parseFastAPIError(body)}`);
  }

  return (await response.json()) as PredictMaturityResponse;
}

export async function checkHealth(): Promise<boolean> {
  try {
    const url = await getResolvedUrl();
    const res = await fetch(`${url}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
