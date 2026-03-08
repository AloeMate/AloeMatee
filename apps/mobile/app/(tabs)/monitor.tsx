import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function MonitorTabScreen() {
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
          <Text style={styles.icon}>📡</Text>
          <Text style={styles.title}>IoT Monitoring</Text>
          <Text style={styles.subtitle}>Real-Time Environmental Data</Text>
        </View>
      </ExpoLinearGradient>
      
      <View style={styles.container}>
        <Card>
          <Text style={styles.cardTitle}>Monitor Your Plants</Text>
          <Text style={styles.cardText}>
            Track environmental conditions in real-time with IoT sensors. 
            Get predictive disease risk alerts based on temperature, humidity, and soil conditions.
          </Text>
          <Button
            title="View Dashboard"
            onPress={() => router.push('/monitor/dashboard')}
            variant="gradient"
            style={styles.button}
            icon="📊"
          />
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Monitored Parameters</Text>
          <Text style={styles.infoText}>• Temperature & Humidity</Text>
          <Text style={styles.infoText}>• Soil Moisture & pH</Text>
          <Text style={styles.infoText}>• Light Intensity</Text>
          <Text style={styles.infoText}>• Disease Risk Predictions</Text>
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
