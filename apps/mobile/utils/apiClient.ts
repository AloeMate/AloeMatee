import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.8.194:8000';
const DEFAULT_TIMEOUT = 30000; // 30 seconds
const RETRY_DELAY = 1000; // 1 second

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
      const response = await axios({
        ...config,
        timeout: config.timeout || DEFAULT_TIMEOUT,
        baseURL: API_BASE_URL,
      });
      return response.data;
    } catch (error) {
      lastError = error as Error;
      
      const axiosError = error as AxiosError;
      
      // Don't retry client errors (4xx)
      if (axiosError.response && axiosError.response.status >= 400 && axiosError.response.status < 500) {
        const errorData = axiosError.response.data as any;
        throw new ApiError(
          errorData?.detail || 'Invalid request',
          axiosError.response.status,
          error
        );
      }
      
      // Retry on network errors or 5xx errors
      if (attempt < retries) {
        await sleep(RETRY_DELAY);
        continue;
      }
    }
  }

  // All retries failed
  throw new ApiError(
    'Network error. Please check your connection and try again.',
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
    const formData = new FormData();
    
    const imageFields = ['image1', 'image2', 'image3'];
    for (let i = 0; i < imageUris.length && i < 3; i++) {
      const uri = imageUris[i];
      const fileName = uri.split('/').pop() || `photo_${i + 1}.jpg`;
      const fileType = `image/${fileName.split('.').pop() || 'jpg'}`;

      // Expo FormData format
      formData.append(imageFields[i], {
        uri,
        type: fileType,
        name: fileName,
      } as any);
    }

    return apiCall<PredictResponse>({
      method: 'POST',
      url: '/api/v1/predict',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds for image upload
    });
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
      headers: {
        'Content-Type': 'multipart/form-data',
      },
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
