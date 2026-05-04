import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

// API Configuration
const getWebApiBaseUrl = () => {
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }

  return undefined;
};

const API_BASE_URL =
  getWebApiBaseUrl() ||
  Constants.expoConfig?.extra?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const RETRY_DELAY = 1000; // 1 second
const IS_WEB = typeof window !== 'undefined' && typeof document !== 'undefined';

// Log API configuration on startup for debugging
console.log('[API] Configuration loaded:', {
  baseUrl: API_BASE_URL,
  publicApiUrl: process.env.EXPO_PUBLIC_API_URL,
  isWeb: IS_WEB,
});

// Typed API responses
export interface DiseasePrediction {
  disease_id: string;
  disease_name: string;
  prob: number;
}

export interface PredictResponse {
  request_id: string;
  num_images_received: number;
  predictions: DiseasePrediction[];
  confidence_status: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_next_step: 'RETAKE' | 'SHOW_TREATMENT';
  symptoms_summary: string;
  inference_stage?: 'main' | 'fallback' | 'vision_api' | 'not_aloe';
  retake_message?: string;
}

export interface Disease {
  disease_id: string;
  disease_name: string;
  description: string;
  severity: string;
  common_symptoms: string[];
}

export interface DiseasesResponse {
  diseases: Disease[];
  count: number;
}

export interface TreatmentStep {
  title: string;
  details: string;
  duration?: string;
  frequency?: string;
}

export interface Citation {
  title: string;
  source: string;
  snippet: string;
}

export interface TreatmentResponse {
  disease_id: string;
  mode: string;
  steps: TreatmentStep[];
  dosage_frequency: string;
  safety_warnings: string[];
  when_to_consult_expert: string[];
  citations: Citation[];
}

export interface HealthResponse {
  status: string;
  version: string;
  message: string;
}

// Harvest API types
export interface CardCorner {
  x: number;
  y: number;
}

export interface CardDetectionResponse {
  success: boolean;
  card_corners: CardCorner[] | null;
  confidence: number | null;
  message: string;
}

export interface LeafMeasurementInput {
  base: { x: number; y: number };
  tip: { x: number; y: number };
}

export interface HarvestLengthResponse {
  leaf_lengths_cm: number[];
  avg_leaf_length_cm: number;
  stage: 'NOT_MATURE' | 'INTERMEDIATE' | 'MATURE';
  confidence_status: 'HIGH' | 'MEDIUM' | 'LOW';
  retake_message: string | null;
}

// Error class for API errors
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public originalError?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Sleep utility for retry delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generic API call with retries
async function apiCall<T>(
  config: AxiosRequestConfig,
  retries: number = 1
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const url = config.url || config.baseURL || '';
      console.log(`[API] Attempt ${attempt + 1}/${retries + 1}: ${config.method?.toUpperCase()} ${API_BASE_URL}${url}`);
      
      // Special handling for FormData on React Native
      let finalConfig = { ...config };
      if (!IS_WEB && config.data instanceof FormData) {
        // Don't use baseURL with FormData, use full URL instead
        console.log('[API] Using full URL for FormData request (React Native)');
        finalConfig = {
          ...config,
          url: API_BASE_URL + (config.url || ''),
          baseURL: undefined,
        };
      } else {
        finalConfig = {
          ...config,
          timeout: config.timeout || DEFAULT_TIMEOUT,
          baseURL: API_BASE_URL,
        };
      }
      
      const response = await axios(finalConfig);
      
      console.log(`[API] Success: ${response.status} ${url}`);
      return response.data;
    } catch (error) {
      lastError = error as Error;
      
      const axiosError = error as AxiosError;
      
      console.error(`[API] Error on attempt ${attempt + 1}:`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
        message: axiosError.message,
        code: axiosError.code,
        url: config.url,
        baseURL: API_BASE_URL,
      });
      
      // Don't retry client errors (4xx)
      if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        const errorData = axiosError.response.data as any;
        const detail = errorData?.detail;
        let message = 'Invalid request';

        if (typeof detail === 'string') {
          message = detail;
        } else if (Array.isArray(detail)) {
          message = detail
            .map((item: any) => item?.msg || item?.message || JSON.stringify(item))
            .join('; ');
        } else if (detail && typeof detail === 'object' && typeof detail.message === 'string') {
          message = detail.message;
        }

        throw new ApiError(
          message,
          axiosError.response.status,
          error
        );
      }
      
      // Retry on network errors or 5xx errors
      if (attempt < retries) {
        console.log(`[API] Retrying in ${RETRY_DELAY}ms...`);
        await sleep(RETRY_DELAY);
        continue;
      }
    }
  }

  // All retries failed
  const errorMsg = lastError instanceof AxiosError && lastError.code === 'ECONNABORTED' 
    ? `Connection timeout. Server at ${API_BASE_URL} not responding.`
    : 'Network error. Please check your connection and try again.';
    
  console.error(`[API] Final error after ${retries + 1} attempts:`, lastError);
  
  throw new ApiError(
    errorMsg,
    undefined,
    lastError
  );
}

// API Client
export const apiClient = {
  /**
   * Health check endpoint
   */
  async healthCheck(): Promise<HealthResponse> {
    return apiCall<HealthResponse>({
      method: 'GET',
      url: '/health',
    });
  },

  /**
   * Predict disease from images
   */
  async predictDisease(imageUris: string[]): Promise<PredictResponse> {
    console.log(`[API] Starting disease prediction with ${imageUris.length} images`);
    
    // Use fetch API directly for file uploads (better React Native support)
    if (!IS_WEB && imageUris.length > 0) {
      return this.predictDiseaseNative(imageUris);
    }
    
    // Web fallback: use axios with FormData
    const formData = new FormData();
    
    const imageFields = ['image1', 'image2', 'image3'];
    for (let i = 0; i < imageUris.length && i < 3; i++) {
      const uri = imageUris[i];
      const fileName = `photo_${i + 1}.jpg`;

      const response = await fetch(uri);
      const blob = await response.blob();
      const file = new File([blob], fileName, {
        type: blob.type || 'image/jpeg',
      });
      formData.append(imageFields[i], file);
    }

    console.log(`[API] FormData prepared with ${imageUris.length} images`);
    
    return apiCall<PredictResponse>(
      {
        method: 'POST',
        url: '/api/v1/predict',
        data: formData,
        timeout: 120000,
      },
      3
    );
  },

  /**
   * Native file upload using fetch API (React Native specific)
   */
  async predictDiseaseNative(imageUris: string[]): Promise<PredictResponse> {
    const formData = new FormData();
    
    const imageFields = ['image1', 'image2', 'image3'];
    for (let i = 0; i < imageUris.length && i < 3; i++) {
      const uri = imageUris[i];
      const fileName = `photo_${i + 1}.jpg`;

      console.log(`[API] Adding image ${i + 1}: ${uri}`);

      // React Native FormData with file object
      formData.append(imageFields[i], {
        uri,
        type: 'image/jpeg',
        name: fileName,
      } as any);
    }

    console.log(`[API] Native FormData prepared with ${imageUris.length} images`);
    console.log(`[API] Uploading to: ${API_BASE_URL}/api/v1/predict`);

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        console.log(`[API] Native Attempt ${attempt + 1}/4: POST ${API_BASE_URL}/api/v1/predict`);
        
        const response = await fetch(`${API_BASE_URL}/api/v1/predict`, {
          method: 'POST',
          body: formData,
          timeout: 120000,
        });

        console.log(`[API] Native response status: ${response.status}`);

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`[API] Native error response:`, errorData);
          throw new ApiError(
            `Upload failed with status ${response.status}`,
            response.status
          );
        }

        const result = await response.json();
        console.log(`[API] Native upload success`);
        return result;
      } catch (error) {
        console.error(`[API] Native error on attempt ${attempt + 1}:`, {
          message: error instanceof Error ? error.message : String(error),
          code: (error as any).code,
        });

        if (attempt < 3) {
          console.log(`[API] Retrying in 1000ms...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      }
    }

    throw new ApiError(
      'Network error uploading images. Please check your connection and try again.',
      undefined
    );
  },

  /**
   * Get all supported diseases
   */
  async getDiseases(): Promise<DiseasesResponse> {
    return apiCall<DiseasesResponse>({
      method: 'GET',
      url: '/api/v1/diseases',
    });
  },

  /**
   * Get treatment for a disease
   */
  async getTreatment(
    diseaseId: string,
    mode: 'SCIENTIFIC' | 'AYURVEDIC'
  ): Promise<TreatmentResponse> {
    return apiCall<TreatmentResponse>({
      method: 'POST',
      url: '/api/v1/treatment',
      data: {
        disease_id: diseaseId,
        mode: mode,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  /**
   * Detect harvest card in image
   * @param imageUri - Local image URI from device
   * @param cropQuad - Optional 4-point crop quad for perspective correction
   */
  async detectHarvestCard(
    imageUri: string,
    cropQuad?: CardCorner[]
  ): Promise<CardDetectionResponse> {
    const formData = new FormData();
    
    // Prepare image file
    const fileName = imageUri.split('/').pop() || 'harvest_image.jpg';
    const fileType = `image/${fileName.split('.').pop() || 'jpg'}`;
    
    formData.append('image', {
      uri: imageUri,
      type: fileType,
      name: fileName,
    } as any);
    
    // Add optional crop quad
    if (cropQuad && cropQuad.length === 4) {
      formData.append('crop_quad', JSON.stringify(cropQuad));
    }
    
    return apiCall<CardDetectionResponse>({
      method: 'POST',
      url: '/api/v4/harvest/detect_card',
      data: formData,
      timeout: 45000, // 45 seconds for image processing
    });
  },

  /**
   * Measure harvest leaf lengths
   * @param imageUri - Local image URI from device
   * @param cardCorners - 4 card corner points for calibration
   * @param leafMeasurements - Array of leaf measurement points (base + tip)
   * @param cropQuad - Optional 4-point crop quad for perspective correction
   */
  async measureHarvestLength(
    imageUri: string,
    cardCorners: CardCorner[],
    leafMeasurements: LeafMeasurementInput[],
    cropQuad?: CardCorner[]
  ): Promise<HarvestLengthResponse> {
    if (cardCorners.length !== 4) {
      throw new ApiError('Card corners must contain exactly 4 points', 400);
    }
    
    if (leafMeasurements.length < 1 || leafMeasurements.length > 3) {
      throw new ApiError('Must provide 1-3 leaf measurements', 400);
    }
    
    const formData = new FormData();
    
    // Prepare image file
    const fileName = imageUri.split('/').pop() || 'harvest_image.jpg';
    const fileType = `image/${fileName.split('.').pop() || 'jpg'}`;
    
    formData.append('image', {
      uri: imageUri,
      type: fileType,
      name: fileName,
    } as any);
    
    // Add required parameters
    formData.append('card_corners', JSON.stringify(cardCorners));
    formData.append('leaf_measurements', JSON.stringify(leafMeasurements));
    formData.append('reference_type', 'CREDIT_CARD');
    
    // Add optional crop quad
    if (cropQuad && cropQuad.length === 4) {
      formData.append('crop_quad', JSON.stringify(cropQuad));
    }
    
    return apiCall<HarvestLengthResponse>({
      method: 'POST',
      url: '/api/v4/harvest/measure_length',
      data: formData,
      timeout: 45000, // 45 seconds for image processing
    });
  },
};

// User-friendly error messages
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'Request timed out. Please try again.';
    }
    
    if (error.code === 'ERR_NETWORK') {
      return 'Cannot connect to server. Please check your internet connection.';
    }
    
    if (error.response) {
      const detail = (error.response.data as any)?.detail;
      if (typeof detail === 'string') {
        return detail;
      }
      return `Server error: ${error.response.status}`;
    }
    
    return 'Network error. Please try again.';
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}
