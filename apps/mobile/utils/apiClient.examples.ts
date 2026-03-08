/**
 * API Client Usage Examples for Harvest Endpoints
 * 
 * This file demonstrates how to use the harvest API methods in your React Native screens.
 */

import { apiClient, getErrorMessage, CardCorner, LeafMeasurementInput } from './apiClient';
import { Alert } from 'react-native';

// ============================================================================
// Example 1: Detect Credit Card in Image
// ============================================================================

export async function exampleDetectCard(imageUri: string) {
  try {
    // Call API to detect card corners
    const response = await apiClient.detectHarvestCard(imageUri);
    
    if (response.success && response.card_corners) {
      console.log('Card detected successfully!');
      console.log('Corners:', response.card_corners);
      console.log('Confidence:', response.confidence);
      
      // Use the detected corners for the next step
      return response.card_corners;
    } else {
      // Card not detected - show manual marking UI
      Alert.alert(
        'Card Detection Failed',
        response.message,
        [{ text: 'Mark Manually', onPress: () => console.log('Show manual marking UI') }]
      );
      return null;
    }
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    Alert.alert('Error', errorMessage);
    console.error('Card detection error:', error);
    return null;
  }
}

// ============================================================================
// Example 2: Detect Card with Perspective Correction (Crop Quad)
// ============================================================================

export async function exampleDetectCardWithCrop(
  imageUri: string,
  cropQuad: CardCorner[]
) {
  try {
    // First apply perspective correction, then detect card
    const response = await apiClient.detectHarvestCard(imageUri, cropQuad);
    
    if (response.success && response.card_corners) {
      console.log('Card detected in cropped region!');
      return response.card_corners;
    } else {
      Alert.alert('Detection Failed', response.message);
      return null;
    }
  } catch (error) {
    Alert.alert('Error', getErrorMessage(error));
    return null;
  }
}

// ============================================================================
// Example 3: Measure Leaf Lengths (Simple - No Crop)
// ============================================================================

export async function exampleMeasureLeaves(
  imageUri: string,
  cardCorners: CardCorner[],
  leafPoints: Array<{ base: { x: number; y: number }; tip: { x: number; y: number } }>
) {
  try {
    // Validate inputs
    if (cardCorners.length !== 4) {
      Alert.alert('Error', 'Please mark all 4 card corners');
      return null;
    }
    
    if (leafPoints.length === 0) {
      Alert.alert('Error', 'Please mark at least 1 leaf');
      return null;
    }
    
    // Call API to measure leaf lengths
    const response = await apiClient.measureHarvestLength(
      imageUri,
      cardCorners,
      leafPoints
    );
    
    console.log('Measurement Results:');
    console.log('Leaf Lengths (cm):', response.leaf_lengths_cm);
    console.log('Average Length:', response.avg_leaf_length_cm, 'cm');
    console.log('Maturity Stage:', response.stage);
    console.log('Confidence:', response.confidence_status);
    
    // Show retake message if needed
    if (response.retake_message) {
      Alert.alert(
        'Retake Recommended',
        response.retake_message,
        [
          { text: 'Retake Photo', style: 'default' },
          { text: 'Continue Anyway', style: 'cancel' }
        ]
      );
    }
    
    return response;
  } catch (error) {
    Alert.alert('Measurement Error', getErrorMessage(error));
    console.error('Measurement error:', error);
    return null;
  }
}

// ============================================================================
// Example 4: Complete Harvest Flow (with Crop Quad)
// ============================================================================

export async function exampleCompleteHarvestFlow(
  imageUri: string,
  cropQuad: CardCorner[],
  cardCorners: CardCorner[],
  leafMeasurements: LeafMeasurementInput[]
) {
  try {
    // Step 1: Detect card with perspective correction
    console.log('Step 1: Detecting card...');
    const detectionResponse = await apiClient.detectHarvestCard(imageUri, cropQuad);
    
    if (!detectionResponse.success) {
      Alert.alert('Detection Failed', detectionResponse.message);
      return null;
    }
    
    // Step 2: Use detected corners or manual corners for measurement
    const finalCardCorners = detectionResponse.card_corners || cardCorners;
    
    console.log('Step 2: Measuring leaves...');
    const measurementResponse = await apiClient.measureHarvestLength(
      imageUri,
      finalCardCorners,
      leafMeasurements,
      cropQuad
    );
    
    // Step 3: Show results
    console.log('=== Harvest Results ===');
    console.log('Leaf Lengths:', measurementResponse.leaf_lengths_cm);
    console.log('Average:', measurementResponse.avg_leaf_length_cm, 'cm');
    console.log('Stage:', measurementResponse.stage);
    
    // Determine if harvest is ready
    const isReady = measurementResponse.stage === 'MATURE';
    const message = isReady
      ? `🌿 Ready to Harvest!\n\nAverage length: ${measurementResponse.avg_leaf_length_cm} cm\nStage: ${measurementResponse.stage}`
      : `🌱 Not Ready Yet\n\nAverage length: ${measurementResponse.avg_leaf_length_cm} cm\nStage: ${measurementResponse.stage}\n\nWait for leaves to reach 25 cm for best quality.`;
    
    Alert.alert('Harvest Assessment', message);
    
    return measurementResponse;
  } catch (error) {
    Alert.alert('Harvest Flow Error', getErrorMessage(error));
    console.error('Complete flow error:', error);
    return null;
  }
}

// ============================================================================
// Example 5: Error Handling with Retry Logic
// ============================================================================

export async function exampleWithRetry(
  imageUri: string,
  cardCorners: CardCorner[],
  leafMeasurements: LeafMeasurementInput[],
  maxRetries: number = 2
) {
  let attempt = 0;
  
  while (attempt <= maxRetries) {
    try {
      const response = await apiClient.measureHarvestLength(
        imageUri,
        cardCorners,
        leafMeasurements
      );
      
      console.log(`✅ Success on attempt ${attempt + 1}`);
      return response;
      
    } catch (error) {
      attempt++;
      const errorMessage = getErrorMessage(error);
      
      if (attempt > maxRetries) {
        // All retries failed
        Alert.alert(
          'Measurement Failed',
          `${errorMessage}\n\nPlease check:\n• Internet connection\n• Image quality\n• Card visibility`,
          [{ text: 'OK' }]
        );
        return null;
      }
      
      console.log(`❌ Attempt ${attempt} failed, retrying...`);
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return null;
}

// ============================================================================
// Example 6: React Component Integration
// ============================================================================

/*
// In your React Native screen component:

import { useState } from 'react';
import { View, Text, Button, Image, Alert } from 'react-native';
import { apiClient, getErrorMessage, CardCorner, LeafMeasurementInput } from '@/utils/apiClient';

export default function HarvestMeasurementScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cardCorners, setCardCorners] = useState<CardCorner[]>([]);
  const [leafMeasurements, setLeafMeasurements] = useState<LeafMeasurementInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const handleDetectCard = async () => {
    if (!imageUri) return;
    
    setLoading(true);
    try {
      const response = await apiClient.detectHarvestCard(imageUri);
      
      if (response.success && response.card_corners) {
        setCardCorners(response.card_corners);
        Alert.alert('Success', 'Card detected automatically!');
      } else {
        Alert.alert('Manual Marking Needed', response.message);
      }
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleMeasure = async () => {
    if (!imageUri || cardCorners.length !== 4 || leafMeasurements.length === 0) {
      Alert.alert('Error', 'Please complete all markings');
      return;
    }
    
    setLoading(true);
    try {
      const response = await apiClient.measureHarvestLength(
        imageUri,
        cardCorners,
        leafMeasurements
      );
      
      setResults(response);
      
      const message = `Average Length: ${response.avg_leaf_length_cm} cm\nStage: ${response.stage}`;
      Alert.alert('Measurement Complete', message);
      
    } catch (error) {
      Alert.alert('Error', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text>Harvest Measurement</Text>
      
      {imageUri && (
        <Image source={{ uri: imageUri }} style={{ width: '100%', height: 300 }} />
      )}
      
      <Button title="Detect Card" onPress={handleDetectCard} disabled={loading} />
      <Button title="Measure Leaves" onPress={handleMeasure} disabled={loading} />
      
      {results && (
        <View>
          <Text>Results:</Text>
          <Text>Average: {results.avg_leaf_length_cm} cm</Text>
          <Text>Stage: {results.stage}</Text>
          <Text>Confidence: {results.confidence_status}</Text>
        </View>
      )}
    </View>
  );
}
*/

// ============================================================================
// Type Guards for Response Validation
// ============================================================================

export function isValidCardDetectionResponse(data: any): boolean {
  return (
    typeof data === 'object' &&
    typeof data.success === 'boolean' &&
    typeof data.message === 'string' &&
    (data.card_corners === null || Array.isArray(data.card_corners))
  );
}

export function isValidHarvestLengthResponse(data: any): boolean {
  return (
    typeof data === 'object' &&
    Array.isArray(data.leaf_lengths_cm) &&
    typeof data.avg_leaf_length_cm === 'number' &&
    typeof data.stage === 'string' &&
    typeof data.confidence_status === 'string'
  );
}
