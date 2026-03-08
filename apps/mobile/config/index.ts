import Constants from 'expo-constants';

// API Configuration
export const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 
  process.env.EXPO_PUBLIC_API_URL || 
  'http://192.168.8.194:8000';

// API Endpoints
export const API_ENDPOINTS = {
  PREDICT: `${API_BASE_URL}/api/v1/predict`,
  TREATMENT: `${API_BASE_URL}/api/v1/treatment`,
  HEALTH: `${API_BASE_URL}/health`,
};

// Confidence Thresholds
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,
  MEDIUM: 0.60,
};

// Image Settings
export const IMAGE_SETTINGS = {
  QUALITY: 0.8,
  MAX_WIDTH: 1024,
  MAX_HEIGHT: 1024,
};

// Photo Capture Settings
export const PHOTO_STAGES = {
  LESION: { id: 1, title: 'Lesion Close-Up', description: 'Focus on damaged areas' },
  WHOLE: { id: 2, title: 'Whole Plant', description: 'Capture entire plant' },
  BASE: { id: 3, title: 'Base & Soil', description: 'Show plant base and soil' },
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  CONFIDENCE_THRESHOLDS,
  IMAGE_SETTINGS,
  PHOTO_STAGES,
};
