import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator 
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/Button';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.139:8000';
const DEVICE_ID = 'DEV001';

export default function MonitorDashboardScreen() {
  const router = useRouter();
  const [reading, setReading] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = async () => {
    try {
      setError(null);
      const [readingRes, predictionRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/iot/readings/latest?deviceId=${DEVICE_ID}`),
        fetch(`${API_BASE_URL}/api/v1/iot/predictions/latest?deviceId=${DEVICE_ID}`),
        fetch(`${API_BASE_URL}/api/v1/iot/stats?deviceId=${DEVICE_ID}`)
      ]);
      
      // Check if MongoDB is unavailable (503 status)
      if (readingRes.status === 503 || predictionRes.status === 503 || statsRes.status === 503) {
        const errorData = await readingRes.json();
        setError(errorData.detail || 'IoT monitoring requires MongoDB to be running');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const readingData = await readingRes.json();
      const predictionData = await predictionRes.json();
      const statsData = await statsRes.json();
      
      setReading(readingData.data);
      setPrediction(predictionData.data);
      setStats(statsData.data);
    } catch (error) {
      console.error('Error fetching IoT data:', error);
      setError('Unable to connect to IoT monitoring service. Please check your network connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };
  
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading IoT Data...</Text>
      </View>
    );
  }
  
  // Show error message if MongoDB is unavailable
  if (error) {
    return (
      <View style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.header}>
          <Button
            title="← Back"
            onPress={() => router.back()}
            style={styles.backButton}
          />
          <Text style={styles.title}>IoT Dashboard</Text>
        </View>
        
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>IoT Monitoring Unavailable</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <Text style={styles.errorHint}>
            To enable IoT monitoring, please start the MongoDB service on your server.
          </Text>
          <Button
            title="Try Again"
            onPress={() => {
              setLoading(true);
              fetchData();
            }}
            style={styles.retryButton}
          />
          <Button
            title="Back to Home"
            onPress={() => router.back()}
            style={styles.backHomeButton}
            variant="outline"
          />
        </View>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.title}>IoT Dashboard</Text>
        <Text style={styles.subtitle}>Real-time Environmental Monitoring</Text>
      </View>
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
      >
        {/* Device Info */}
        <View style={styles.deviceCard}>
          <Text style={styles.deviceId}>📡 Device: {DEVICE_ID}</Text>
          {reading && (
            <Text style={styles.lastUpdate}>
              Last update: {new Date(reading.recordedAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
        
        {/* Environmental Data */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌡️ Environmental Conditions</Text>
          {reading ? (
            <>
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Temperature</Text>
                <Text style={[styles.metricValue, { color: getColor(reading.temperature, 10, 35, 15, 30) }]}>
                  {reading.temperature}°C
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Humidity</Text>
                <Text style={[styles.metricValue, { color: getColor(reading.humidity, 30, 80, 40, 70) }]}>
                  {reading.humidity}%
                </Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.metricRow}>
                <Text style={styles.metricLabel}>Soil Moisture</Text>
                <Text style={[styles.metricValue, { color: reading.soilMoisture < 20 ? '#D32F2F' : reading.soilMoisture < 30 ? '#FF9800' : '#4CAF50' }]}>
                  {reading.soilMoisture}%
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.noData}>No data available yet. Start sending sensor readings.</Text>
          )}
        </View>
        
        {/* Prediction */}
        {prediction && (
          <>
            {/* Risk Score */}
            {prediction.risk_score !== undefined && (
              <View style={[styles.card, styles.riskScoreCard]}>
                <Text style={styles.cardTitle}>📊 Overall Risk Score</Text>
                <View style={styles.riskScoreBox}>
                  <Text style={[
                    styles.riskScoreValue,
                    { color: getRiskColor(prediction.risk_score) }
                  ]}>
                    {(prediction.risk_score * 100).toFixed(0)}%
                  </Text>
                  <Text style={styles.riskScoreLabel}>
                    {getRiskLabel(prediction.risk_score)}
                  </Text>
                </View>
              </View>
            )}

            {/* Primary Prediction (Backward Compatibility) */}
            <View style={[styles.card, styles.predictionCard]}>
              <Text style={styles.cardTitle}>⚠️ Disease Risk Prediction</Text>
              <View style={styles.predictionBox}>
                <Text style={styles.diseaseText}>{prediction.disease}</Text>
                <Text style={styles.confidenceText}>
                  {(prediction.confidence * 100).toFixed(0)}% Confidence
                </Text>
                {prediction.disease !== 'No Risk' && prediction.confidence >= 0.7 && (
                  <View style={styles.warningBox}>
                    <Text style={styles.warningText}>
                      ⚠️ High risk! Take preventive action.
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Top Predictions */}
            {prediction.predicted_risk_diseases && prediction.predicted_risk_diseases.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🔍 Risk Assessment (Top Predictions)</Text>
                {prediction.predicted_risk_diseases.map((item: any, index: number) => (
                  <View key={index} style={styles.diseaseItem}>
                    <View style={styles.diseaseItemLeft}>
                      <Text style={styles.diseaseRank}>#{index + 1}</Text>
                      <Text style={styles.diseaseName}>{item.disease}</Text>
                    </View>
                    <Text style={[
                      styles.diseaseProbability,
                      { color: item.probability > 0.5 ? '#D32F2F' : '#FF9800' }
                    ]}>
                      {(item.probability * 100).toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Preventive Actions */}
            {prediction.recommended_preventive_actions && prediction.recommended_preventive_actions.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💡 Recommended Actions</Text>
                {prediction.recommended_preventive_actions.map((action: string, index: number) => (
                  <View key={index} style={styles.actionItem}>
                    <Text style={styles.actionBullet}>•</Text>
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
        
        {/* Stats */}
        {stats && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 Statistics</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_readings}</Text>
                <Text style={styles.statLabel}>Readings</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total_predictions}</Text>
                <Text style={styles.statLabel}>Predictions</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.unacknowledged_alerts}</Text>
                <Text style={styles.statLabel}>Alerts</Text>
              </View>
            </View>
          </View>
        )}
        
        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <Button
            title="🚨 View All Alerts"
            onPress={() => router.push('/monitor/alerts')}
            style={styles.actionButton}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function getColor(value: number, min: number, max: number, warn_min: number, warn_max: number): string {
  if (value < min || value > max) return '#D32F2F';
  if (value < warn_min || value > warn_max) return '#FF9800';
  return '#4CAF50';
}

function getRiskColor(riskScore: number): string {
  if (riskScore < 0.3) return '#4CAF50'; // Low risk - green
  if (riskScore < 0.6) return '#FF9800'; // Medium risk - orange
  return '#D32F2F'; // High risk - red
}

function getRiskLabel(riskScore: number): string {
  if (riskScore < 0.3) return '✅ Low Risk';
  if (riskScore < 0.6) return '⚠️ Medium Risk';
  return '🚨 High Risk';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#546E7A',
  },
  header: {
    padding: 16,
    backgroundColor: '#4CAF50',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2E7D32',
    borderRadius: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    fontSize: 14,
    color: '#E8F5E9',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  deviceCard: {
    backgroundColor: '#E8F5E9',
    padding: 16,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  deviceId: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  lastUpdate: {
    fontSize: 12,
    color: '#2E7D32',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 16,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricLabel: {
    fontSize: 16,
    color: '#546E7A',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  noData: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingVertical: 20,
  },
  predictionCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  predictionBox: {
    alignItems: 'center',
  },
  diseaseText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  confidenceText: {
    fontSize: 16,
    color: '#F57C00',
    fontWeight: '600',
  },
  warningBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    width: '100%',
  },
  warningText: {
    fontSize: 14,
    color: '#C62828',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#546E7A',
    marginTop: 4,
  },
  actionsCard: {
    padding: 16,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#FF5722',
    paddingVertical: 16,
    borderRadius: 12,
  },
  // Risk Score Styles
  riskScoreCard: {
    backgroundColor: '#E3F2FD',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  riskScoreBox: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  riskScoreValue: {
    fontSize: 48,
    fontWeight: '700',
    marginBottom: 8,
  },
  riskScoreLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  // Disease Item Styles
  diseaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 8,
  },
  diseaseItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  diseaseRank: {
    fontSize: 14,
    fontWeight: '700',
    color: '#757575',
    marginRight: 12,
    width: 30,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  diseaseProbability: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Action Item Styles
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingLeft: 8,
  },
  actionBullet: {
    fontSize: 18,
    color: '#4CAF50',
    marginRight: 8,
    fontWeight: '700',
  },
  actionText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
    flex: 1,
  },
  // Error Container Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAFAFA',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  errorHint: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  retryButton: {
    marginBottom: 12,
    minWidth: 200,
  },
  backHomeButton: {
    minWidth: 200,
  },
});
