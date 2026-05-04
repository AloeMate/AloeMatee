import Constants from 'expo-constants';

function getBaseUrl(): string {
  // Automatically grab the current local IP address from Expo's dev server
  const debuggerHost = Constants.expoConfig?.hostUri;
  if (debuggerHost) {
    const ip = debuggerHost.split(':')[0];
    return `http://${ip}:8000`;
  }
  
  // Fallback if not running in Expo dev mode
  return 'http://192.168.1.11:8000';
}

let _resolvedUrl: string | null = null;

async function getResolvedUrl(): Promise<string> {
  if (!_resolvedUrl) {
    _resolvedUrl = getBaseUrl();
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

export interface PredictMaturityResponse {
  is_aloe_vera:     boolean;
  cnn_model:        ModelResult;
  geo_algorithm:    GeoResult | null;
  classes_match:    boolean;
  harvest_required: boolean;
  harvest_message:  string | null;
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
  }
  return body;
}

export async function predictMaturity(
  cnnImageUri: string,
  geoImageUri: string,
  roi: ROI,
): Promise<PredictMaturityResponse> {
  const BASE_URL = await getResolvedUrl();

  const form = new FormData();

  form.append(
    'cnn_image',
    { uri: cnnImageUri, name: 'cnn_image.jpg', type: 'image/jpeg' } as unknown as Blob
  );
  form.append(
    'geo_image',
    { uri: geoImageUri, name: 'geo_image.jpg', type: 'image/jpeg' } as unknown as Blob
  );
  form.append('roi_x', String(roi.x));
  form.append('roi_y', String(roi.y));
  form.append('roi_r', String(roi.r));

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/maturity/predict`, {
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