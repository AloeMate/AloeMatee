import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Card from '../components/Card';
import ProgressBar from '../components/ProgressBar';
import GlobalError from '../components/GlobalError';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiClient, getErrorMessage } from '../utils/apiClient';

export default function UploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('Preparing images...');
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    uploadImages();
  }, []);

  const uploadImages = async () => {
    try {
      setError(null);
      setIsRetrying(false);
      
      const photosParam = params.photos as string;
      if (!photosParam) {
        throw new Error('No photos to upload');
      }

      const photoUris = JSON.parse(photosParam) as string[];
      
      setCurrentStep('Preparing images...');
      setUploadProgress(0.1);

      await new Promise(resolve => setTimeout(resolve, 300));

      setCurrentStep('Uploading to server...');
      setUploadProgress(0.3);

      // Upload using API client with retry logic
      const result = await apiClient.predictDisease(photoUris);

      setCurrentStep('Analyzing images with AI...');
      setUploadProgress(0.8);

      // Simulate AI processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUploadProgress(1);
      setCurrentStep('Analysis complete!');

      // Navigate to results
      setTimeout(() => {
        router.replace({
          pathname: '/results',
          params: {
            result: JSON.stringify(result),
          },
        });
      }, 500);

    } catch (err) {
      console.error('Upload error:', err);
      setError(getErrorMessage(err));
    }
  };

  const handleRetry = () => {
    setIsRetrying(true);
    uploadImages();
  };

  const handleGoBack = () => {
    router.replace('/camera-capture');
  };

  if (error) {
    return (
      <GlobalError
        message={error}
        onRetry={handleRetry}
        onDismiss={handleGoBack}
      />
    );
  }

  if (isRetrying) {
    return <LoadingSpinner message="Retrying upload..." />;
  }

  return (
    <View style={styles.container}>
      <Card style={styles.uploadCard}>
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>🔬</Text>
        </View>
        
        <Text style={styles.title}>Analyzing Your Plant</Text>
        <Text style={styles.subtitle}>
          Our AI is examining the photos to detect any diseases
        </Text>

        <View style={styles.progressSection}>
          <ActivityIndicator size="large" color="#4CAF50" style={styles.spinner} />
          
          <ProgressBar 
            current={Math.round(uploadProgress * 100)} 
            total={100} 
          />

          <Text style={styles.stepText}>{currentStep}</Text>
        </View>
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>⏱️ This usually takes:</Text>
        <Text style={styles.infoText}>• Upload: 5-10 seconds</Text>
        <Text style={styles.infoText}>• Analysis: 10-15 seconds</Text>
        <Text style={styles.infoText}>• Total: ~20 seconds</Text>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>🔍 What We're Analyzing:</Text>
        <Text style={styles.tipText}>✓ Leaf color and texture</Text>
        <Text style={styles.tipText}>✓ Spot patterns and lesions</Text>
        <Text style={styles.tipText}>✓ Plant structure and health</Text>
        <Text style={styles.tipText}>✓ Root and soil conditions</Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  uploadCard: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  iconContainer: {
    marginBottom: 20,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  progressSection: {
    width: '100%',
  },
  spinner: {
    marginBottom: 20,
  },
  stepText: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 10,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#F3E5F5',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#7B1FA2',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
    lineHeight: 20,
  },
  suggestionCard: {
    marginTop: 20,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    lineHeight: 20,
  },
});
