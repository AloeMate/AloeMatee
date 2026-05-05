import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL } from '../../config';

// ─── Soil type options ──────────────────────────────────────────────────────
const SOIL_TYPES = [
  { label: '🟫 Loamy', value: 'loamy' },
  { label: '🏖️ Sandy', value: 'sandy' },
  { label: '🧱 Clay', value: 'clay' },
];

// ─── Dummy fallback sensor data (same as harvest_prediction mock IoT) ───────
const DUMMY_SENSOR = {
  temperature: 30,
  humidity: 65,
  soil_moisture: 40,
  source: 'dummy',
};

const DEVICE_ID = 'DEV001';

// ─── Types ──────────────────────────────────────────────────────────────────
interface SensorData {
  temperature: number;
  humidity: number;
  soil_moisture: number;
  source: 'iot' | 'dummy';
}

interface FertilizerResult {
  predicted_ph: number;
  recommended_fertilizer: string;
  application_rate: string;
  notes: string;
  sensor_status: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getMoistureLabel(value: number): string {
  if (value < 25) return 'low';
  if (value < 55) return 'medium';
  return 'high';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'hot': return '#FF5722';
    case 'dry': return '#FF9800';
    case 'wet': return '#2196F3';
    default:    return '#4CAF50';
  }
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'hot': return '🔥';
    case 'dry': return '🏜️';
    case 'wet': return '💧';
    default:    return '✅';
  }
}

function getTempColor(temp: number): string {
  if (temp > 35) return '#D32F2F';
  if (temp > 30) return '#FF9800';
  return '#4CAF50';
}

function getHumidColor(hum: number): string {
  if (hum > 80) return '#2196F3';
  if (hum < 30) return '#FF9800';
  return '#4CAF50';
}

function getMoistColor(moisture: number): string {
  if (moisture < 20) return '#D32F2F';
  if (moisture < 30) return '#FF9800';
  return '#4CAF50';
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function FertilizerAdvisorScreen() {
  const router = useRouter();

  const [sensor, setSensor] = useState<SensorData>(DUMMY_SENSOR);
  const [selectedSoil, setSelectedSoil] = useState<string>('loamy');
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<FertilizerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch sensor data ─────────────────────────────────────────────────────
  const fetchSensorData = useCallback(async () => {
    try {
      // First try the fertilizer/sensor-data endpoint (uses IoT if available)
      const res = await fetch(
        `${API_BASE_URL}/api/v1/fertilizer/sensor-data?deviceId=${DEVICE_ID}`
      );
      if (res.ok) {
        const data = await res.json();
        setSensor(data);
        setError(null);
      } else {
        // Fall back to calling IoT readings directly
        const iotRes = await fetch(
          `${API_BASE_URL}/api/v1/iot/readings/latest?deviceId=${DEVICE_ID}`
        );
        if (iotRes.ok) {
          const iotData = await iotRes.json();
          if (iotData.data) {
            setSensor({
              temperature: iotData.data.temperature,
              humidity: iotData.data.humidity,
              soil_moisture: iotData.data.soilMoisture,
              source: 'iot',
            });
            setError(null);
          } else {
            setSensor(DUMMY_SENSOR);
          }
        } else {
          setSensor(DUMMY_SENSOR);
        }
      }
    } catch {
      // Network error — use dummy data
      setSensor(DUMMY_SENSOR);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSensorData();
    // Auto-refresh sensor every 10 seconds (same interval pattern as IoT monitor)
    const interval = setInterval(fetchSensorData, 10000);
    return () => clearInterval(interval);
  }, [fetchSensorData]);

  const onRefresh = () => {
    setRefreshing(true);
    setResult(null);
    fetchSensorData();
  };

  // ── Run prediction ────────────────────────────────────────────────────────
  const handlePredict = async () => {
    setPredicting(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/fertilizer/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: sensor.temperature,
          humidity: sensor.humidity,
          soil_moisture: sensor.soil_moisture,
          soil_type: selectedSoil,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Prediction failed');
      }
      const data: FertilizerResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Prediction failed. Please try again.');
    } finally {
      setPredicting(false);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Sensor Data…</Text>
      </View>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <View style={styles.wrapper}>
      <StatusBar style="light" />

      {/* Header */}
      <ExpoLinearGradient
        colors={['#1B5E20', '#2E7D32', '#388E3C']}
        style={styles.gradientHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌱 Fertilizer Advisor</Text>
        <Text style={styles.headerSubtitle}>
          AI-powered fertilizer recommendations for aloe vera
        </Text>
      </ExpoLinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4CAF50']}
          />
        }
      >
        {/* ── Sensor Data Card ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>📡 Sensor Data</Text>
            <View style={[
              styles.sourceBadge,
              { backgroundColor: sensor.source === 'iot' ? '#4CAF50' : '#FF9800' }
            ]}>
              <Text style={styles.sourceBadgeText}>
                {sensor.source === 'iot' ? '🔴 Live IoT' : '🔵 Demo'}
              </Text>
            </View>
          </View>

          {sensor.source === 'dummy' && (
            <View style={styles.dummyNotice}>
              <Text style={styles.dummyNoticeText}>
                ℹ️ Using demo sensor data. Connect your IoT device to see live readings.
              </Text>
            </View>
          )}

          <View style={styles.metricsGrid}>
            {/* Temperature */}
            <View style={styles.metricBox}>
              <Text style={styles.metricEmoji}>🌡️</Text>
              <Text style={[styles.metricValue, { color: getTempColor(sensor.temperature) }]}>
                {sensor.temperature}°C
              </Text>
              <Text style={styles.metricLabel}>Temperature</Text>
            </View>

            {/* Humidity */}
            <View style={styles.metricBox}>
              <Text style={styles.metricEmoji}>💧</Text>
              <Text style={[styles.metricValue, { color: getHumidColor(sensor.humidity) }]}>
                {sensor.humidity}%
              </Text>
              <Text style={styles.metricLabel}>Humidity</Text>
            </View>

            {/* Soil Moisture */}
            <View style={styles.metricBox}>
              <Text style={styles.metricEmoji}>🌱</Text>
              <Text style={[styles.metricValue, { color: getMoistColor(sensor.soil_moisture) }]}>
                {getMoistureLabel(sensor.soil_moisture)}
              </Text>
              <Text style={styles.metricLabel}>Soil Moisture</Text>
            </View>
          </View>
        </View>

        {/* ── Soil Type Selector ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🌍 Select Soil Type</Text>
          <View style={styles.soilRow}>
            {SOIL_TYPES.map((soil) => (
              <TouchableOpacity
                key={soil.value}
                style={[
                  styles.soilBtn,
                  selectedSoil === soil.value && styles.soilBtnActive,
                ]}
                onPress={() => {
                  setSelectedSoil(soil.value);
                  setResult(null);
                }}
              >
                <Text
                  style={[
                    styles.soilBtnText,
                    selectedSoil === soil.value && styles.soilBtnTextActive,
                  ]}
                >
                  {soil.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Predict Button ── */}
        <TouchableOpacity
          style={[styles.predictBtn, predicting && styles.predictBtnDisabled]}
          onPress={handlePredict}
          disabled={predicting}
          activeOpacity={0.85}
        >
          <ExpoLinearGradient
            colors={predicting ? ['#A5D6A7', '#A5D6A7'] : ['#2E7D32', '#4CAF50']}
            style={styles.predictBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {predicting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.predictBtnText}>🔬 Get Fertilizer Recommendation</Text>
            )}
          </ExpoLinearGradient>
        </TouchableOpacity>

        {/* ── Error ── */}
        {error && !result && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={() => setError(null)}>
              <Text style={styles.errorDismiss}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Result Card ── */}
        {result && (
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>🌿 Fertilizer Recommendation</Text>
              <View style={[
                styles.conditionBadge,
                { backgroundColor: getStatusColor(result.sensor_status) }
              ]}>
                <Text style={styles.conditionBadgeText}>
                  {getStatusEmoji(result.sensor_status)}{' '}
                  {result.sensor_status.charAt(0).toUpperCase() + result.sensor_status.slice(1)}
                </Text>
              </View>
            </View>

            {/* pH */}
            <View style={styles.resultRow}>
              <View style={styles.resultIcon}>
                <Text style={styles.resultIconText}>🧪</Text>
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>Predicted Soil pH</Text>
                <Text style={styles.resultValueLarge}>{result.predicted_ph}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Fertilizer */}
            <View style={styles.resultRow}>
              <View style={styles.resultIcon}>
                <Text style={styles.resultIconText}>🌱</Text>
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>Recommended Fertilizer</Text>
                <Text style={styles.resultValue}>{result.recommended_fertilizer}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Application Rate */}
            <View style={styles.resultRow}>
              <View style={styles.resultIcon}>
                <Text style={styles.resultIconText}>⚖️</Text>
              </View>
              <View style={styles.resultContent}>
                <Text style={styles.resultLabel}>Application Rate</Text>
                <Text style={styles.resultValue}>{result.application_rate}</Text>
              </View>
            </View>

            {/* Notes */}
            {result.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>💡 {result.notes}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* ── Navigation to IoT Monitor ── */}
        <View style={styles.iotLinkCard}>
          <Text style={styles.iotLinkTitle}>📡 IoT Monitor Integration</Text>
          <Text style={styles.iotLinkText}>
            Connect your IoT sensors for live readings. This advisor automatically
            uses real-time data from the IoT monitoring section.
          </Text>
          <TouchableOpacity
            style={styles.iotLinkBtn}
            onPress={() => router.push('/monitor/dashboard' as any)}
          >
            <Text style={styles.iotLinkBtnText}>Open IoT Monitor →</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#546E7A',
    fontWeight: '500',
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? 40 : 56,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  backBtn: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#C8E6C9',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B5E20',
  },
  sourceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sourceBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dummyNotice: {
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  dummyNoticeText: {
    fontSize: 12,
    color: '#E65100',
    lineHeight: 18,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F1F8E9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  metricEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 11,
    color: '#546E7A',
    fontWeight: '600',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  soilRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  soilBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F5F7FA',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  soilBtnActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  soilBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#78909C',
    textAlign: 'center',
  },
  soilBtnTextActive: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  predictBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  predictBtnDisabled: {
    opacity: 0.7,
  },
  predictBtnGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#D32F2F',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#B71C1C',
    lineHeight: 20,
  },
  errorDismiss: {
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: '700',
    marginLeft: 8,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B5E20',
  },
  conditionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conditionBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
  },
  resultIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultIconText: {
    fontSize: 22,
  },
  resultContent: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 12,
    color: '#78909C',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  resultValueLarge: {
    fontSize: 28,
    fontWeight: '900',
    color: '#2E7D32',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    lineHeight: 22,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  notesBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#1B5E20',
    lineHeight: 20,
    fontWeight: '500',
  },
  iotLinkCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 16,
    padding: 20,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  iotLinkTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0D47A1',
    marginBottom: 8,
  },
  iotLinkText: {
    fontSize: 13,
    color: '#1565C0',
    lineHeight: 20,
    marginBottom: 14,
  },
  iotLinkBtn: {
    backgroundColor: '#1976D2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  iotLinkBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
