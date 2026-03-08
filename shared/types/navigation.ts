/**
 * Navigation types for React Navigation
 */

import { DiseaseResponse } from './index';

export type RootStackParamList = {
  Home: undefined;
  Capture: undefined;
  Result: {
    result: DiseaseResponse;
    imageUri: string;
  };
  Treatment: {
    diseaseId: string;
    diseaseName: string;
    treatmentType: 'scientific' | 'ayurvedic';
  };
};
