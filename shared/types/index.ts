/**
 * Disease prediction models
 */

export interface DiseasePrediction {
  disease_id: string;
  disease_name: string;
  confidence: number;
  description?: string;
}

export interface DiseaseResponse {
  status: 'High' | 'Medium' | 'Low';
  predictions: DiseasePrediction[];
  message?: string;
}

/**
 * Treatment guidance models
 */

export interface TreatmentStep {
  title: string;
  description: string;
  duration?: string;
  frequency?: string;
}

export interface Citation {
  text: string;
  source?: string;
  url?: string;
}

export interface TreatmentRequest {
  disease_id: string;
  treatment_type: 'scientific' | 'ayurvedic';
}

export interface TreatmentResponse {
  disease_id: string;
  disease_name: string;
  treatment_type: 'scientific' | 'ayurvedic';
  overview?: string;
  steps: TreatmentStep[];
  safety_warnings?: string[];
  additional_tips?: string[];
  citations?: Citation[];
}

/**
 * Health check model
 */

export interface HealthCheckResponse {
  status: string;
  version: string;
  message: string;
}
