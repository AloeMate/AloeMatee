import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity 
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/Button';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.8.139:8000';
const DEVICE_ID = 'DEV001';

interface Alert {
  _id: string;
  deviceId: string;
  disease: string;
  confidence: number;
  message: string;
  severity: 'HIGH' | 'MEDIUM';
  timestamp: string;
  acknowledged: boolean;
}

export default function AlertsScreen() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('all');

  const fetchAlerts = async () => {
    try {
      const unacknowledgedOnly = filter === 'unacknowledged';
      const response = await fetch(
        `${API_BASE_URL}/api/v1/iot/alerts?deviceId=${DEVICE_ID}&limit=50&unacknowledged_only=${unacknowledgedOnly}`
      );
      const data = await response.json();
      setAlerts(data.data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/iot/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      // Refresh the list
      fetchAlerts();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [filter]);

  const getSeverityColor = (severity: string) => {
    return severity === 'HIGH' ? '#D32F2F' : '#FF9800';
  };

  const getAlertIcon = (severity: string) => {
    return severity === 'HIGH' ? '🚨' : '⚠️';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading Alerts...</Text>
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
        <Text style={styles.title}>Alerts & Warnings</Text>
        <Text style={styles.subtitle}>Device: {DEVICE_ID}</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'unacknowledged' && styles.filterButtonActive]}
          onPress={() => setFilter('unacknowledged')}
        >
          <Text style={[styles.filterText, filter === 'unacknowledged' && styles.filterTextActive]}>
            Unacknowledged
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#4CAF50']} />
        }
      >
        {/* Alert Threshold Information */}
        <View style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoTitle}>Alert Thresholds</Text>
          </View>
          <Text style={styles.infoDescription}>
            Alerts are automatically generated when conditions exceed safe limits:
          </Text>
          <View style={styles.thresholdList}>
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdIcon}>🦠</Text>
              <View style={styles.thresholdTextContainer}>
                <Text style={styles.thresholdLabel}>Disease Risk</Text>
                <Text style={styles.thresholdValue}>Confidence ≥ 70%</Text>
              </View>
            </View>
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdIcon}>🌡️</Text>
              <View style={styles.thresholdTextContainer}>
                <Text style={styles.thresholdLabel}>Temperature</Text>
                <Text style={styles.thresholdValue}>{'< 10°C or > 35°C'}</Text>
              </View>
            </View>
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdIcon}>💧</Text>
              <View style={styles.thresholdTextContainer}>
                <Text style={styles.thresholdLabel}>Humidity</Text>
                <Text style={styles.thresholdValue}>{'< 30% or > 80%'}</Text>
              </View>
            </View>
            <View style={styles.thresholdItem}>
              <Text style={styles.thresholdIcon}>🌱</Text>
              <View style={styles.thresholdTextContainer}>
                <Text style={styles.thresholdLabel}>Soil Moisture</Text>
                <Text style={styles.thresholdValue}>{'< 20%'}</Text>
              </View>
            </View>
          </View>
        </View>
        {alerts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No alerts at the moment</Text>
            <Text style={styles.emptySubtext}>
              Your plant environment is optimal
            </Text>
          </View>
        ) : (
          <View style={styles.alertsContainer}>
            {alerts.map((alert) => (
              <View
                key={alert._id}
                style={[
                  styles.alertCard,
                  { borderLeftColor: getSeverityColor(alert.severity) },
                ]}
              >
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <Text style={styles.alertIcon}>{getAlertIcon(alert.severity)}</Text>
                  <Text style={styles.alertDisease}>{alert.disease}</Text>
                </View>
                <View
                  style={[
                    styles.severityBadge,
                    { backgroundColor: getSeverityColor(alert.severity) },
                  ]}
                >
                  <Text style={styles.severityText}>{alert.severity}</Text>
                </View>
              </View>

              <Text style={styles.alertMessage}>{alert.message}</Text>

              <View style={styles.alertMeta}>
                <Text style={styles.metaText}>
                  Confidence: {(alert.confidence * 100).toFixed(0)}%
                </Text>
                <Text style={styles.metaText}>
                  {new Date(alert.timestamp).toLocaleString()}
                </Text>
              </View>

              {!alert.acknowledged ? (
                <TouchableOpacity
                  style={styles.acknowledgeButton}
                  onPress={() => acknowledgeAlert(alert._id)}
                >
                  <Text style={styles.acknowledgeText}>✓ Acknowledge</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.acknowledgedBadge}>
                  <Text style={styles.acknowledgedText}>✓ Acknowledged</Text>
                </View>
              )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
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
  filterContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#546E7A',
  },
  filterTextActive: {
    color: '#2E7D32',
  },
  scrollView: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1565C0',
  },
  infoDescription: {
    fontSize: 13,
    color: '#546E7A',
    marginBottom: 12,
    lineHeight: 18,
  },
  thresholdList: {
    gap: 10,
  },
  thresholdItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 12,
    borderRadius: 8,
  },
  thresholdIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  thresholdTextContainer: {
    flex: 1,
  },
  thresholdLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1B5E20',
    marginBottom: 2,
  },
  thresholdValue: {
    fontSize: 12,
    color: '#546E7A',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    marginHorizontal: 16,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
  },sContainer: {
    padding: 16,
    paddingTop: 0,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  alertIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  alertDisease: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  alertMessage: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  metaText: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  acknowledgeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  acknowledgedBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  acknowledgedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
});
