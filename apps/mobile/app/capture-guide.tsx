import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import Card from '../components/Card';

export default function CaptureGuideScreen() {
  const router = useRouter();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.title}>📸 Photo Capture Guide</Text>
        <Text style={styles.description}>
          For best results, we'll guide you to take 3 specific photos of your plant.
        </Text>
      </Card>

      <Card style={styles.instructionCard}>
        <View style={styles.photoStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>📍 Lesion Close-Up</Text>
            <Text style={styles.stepDescription}>
              Take a close-up photo of any spots, discoloration, or damaged areas on the leaves.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.instructionCard}>
        <View style={styles.photoStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🌿 Whole Plant</Text>
            <Text style={styles.stepDescription}>
              Capture the entire plant to show overall health and structure.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.instructionCard}>
        <View style={styles.photoStep}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>🪴 Base & Soil</Text>
            <Text style={styles.stepDescription}>
              Photograph the base of the plant and surrounding soil to check for root issues.
            </Text>
          </View>
        </View>
      </Card>

      <Card style={styles.tipsCard}>
        <Text style={styles.tipsTitle}>✨ Quick Tips</Text>
        <Text style={styles.tip}>• Use natural daylight when possible</Text>
        <Text style={styles.tip}>• Avoid shadows and harsh lighting</Text>
        <Text style={styles.tip}>• Hold camera steady for clear focus</Text>
        <Text style={styles.tip}>• Fill the frame with the subject</Text>
        <Text style={styles.tip}>• You can retake any photo</Text>
      </Card>

      <Button
        title="📷 Open Camera"
        onPress={() => router.push('/camera-capture')}
        variant="success"
        style={styles.button}
      />

      <Text style={styles.note}>
        This will take about 1-2 minutes. Make sure you have good lighting!
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  description: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
  },
  instructionCard: {
    backgroundColor: '#fff',
  },
  photoStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  stepDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 10,
  },
  tip: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
  },
  note: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});
