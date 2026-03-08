import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function DiagnoseTabScreen() {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      <StatusBar style="light" />
      <ExpoLinearGradient
        colors={['#1B5E20', '#2E7D32', '#4CAF50']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <Text style={styles.icon}>🔬</Text>
          <Text style={styles.title}>Disease Detection</Text>
          <Text style={styles.subtitle}>AI-Powered Diagnosis</Text>
        </View>
      </ExpoLinearGradient>
      
      <View style={styles.container}>
        <Card>
          <Text style={styles.cardTitle}>Quick Start</Text>
          <Text style={styles.cardText}>
            Take 3 clear photos of your aloe vera plant to detect diseases using our AI model. 
            Get instant results with confidence scores and personalized treatment plans.
          </Text>
          <Button
            title="Start Disease Detection"
            onPress={() => router.push('/capture-guide')}
            variant="gradient"
            style={styles.button}
            icon="📸"
          />
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>How It Works</Text>
          <Text style={styles.infoText}>1. Capture 3 photos of affected areas</Text>
          <Text style={styles.infoText}>2. AI analyzes images for diseases</Text>
          <Text style={styles.infoText}>3. View results with confidence scores</Text>
          <Text style={styles.infoText}>4. Get treatment recommendations</Text>
        </Card>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  gradientHeader: {
    paddingTop: 50,
    paddingBottom: 40,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  header: {
    alignItems: 'center',
  },
  icon: {
    fontSize: 56,
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F5E9',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 24,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 12,
  },
  cardText: {
    fontSize: 15,
    color: '#546E7A',
    lineHeight: 24,
    marginBottom: 20,
  },
  button: {
    marginVertical: 0,
  },
  infoCard: {
    marginTop: 16,
    backgroundColor: '#E8F5E9',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 15,
    color: '#1B5E20',
    marginBottom: 8,
    lineHeight: 22,
  },
});
