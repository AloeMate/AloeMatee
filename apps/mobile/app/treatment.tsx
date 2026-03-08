import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Card from '../components/Card';
import GlobalError from '../components/GlobalError';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfidenceBadge from '../components/ConfidenceBadge';
import { apiClient, getErrorMessage, TreatmentResponse } from '../utils/apiClient';

export default function TreatmentScreen() {
  const params = useLocalSearchParams();
  const [treatment, setTreatment] = useState<TreatmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { diseaseId, diseaseName, treatmentType } = params;

  useEffect(() => {
    fetchTreatment();
  }, []);

  const fetchTreatment = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const mode = treatmentType === 'scientific' ? 'SCIENTIFIC' : 'AYURVEDIC';
      const data = await apiClient.getTreatment(diseaseId as string, mode);

      setTreatment(data);
    } catch (err) {
      console.error('Treatment fetch error:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading treatment plan..." />;
  }

  if (error || !treatment) {
    return (
      <GlobalError
        message={error || 'Failed to load treatment plan'}
        onRetry={fetchTreatment}
      />
    );
  }

  const treatmentIcon = treatmentType === 'scientific' ? '🔬' : '🌿';
  const treatmentLabel = treatmentType === 'scientific' ? 'Scientific' : 'Ayurvedic';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.treatmentIcon}>{treatmentIcon}</Text>
        <Text style={styles.diseaseTitle}>{diseaseName}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{treatmentLabel} Treatment</Text>
        </View>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>💊 Treatment Steps</Text>
        <Text style={styles.sectionSubtitle}>Follow these steps carefully for best results</Text>
        
        {treatment.steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepHeader}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.stepTitle}>{step.title}</Text>
            </View>

            <Text style={styles.stepDescription}>{step.details}</Text>

            {(step.duration || step.frequency) && (
              <View style={styles.stepMeta}>
                {step.duration && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>⏱️</Text>
                    <Text style={styles.metaText}>{step.duration}</Text>
                  </View>
                )}
                {step.frequency && (
                  <View style={styles.metaItem}>
                    <Text style={styles.metaIcon}>🔄</Text>
                    <Text style={styles.metaText}>{step.frequency}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        ))}
      </Card>

      <Card style={styles.dosageCard}>
        <Text style={styles.sectionTitle}>📋 Dosage & Frequency</Text>
        <Text style={styles.sectionText}>{treatment.dosage_frequency}</Text>
      </Card>

      {treatment.safety_warnings && treatment.safety_warnings.length > 0 && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Safety Warnings</Text>
          <Text style={styles.warningSubtitle}>
            Please read these important safety guidelines
          </Text>
          {treatment.safety_warnings.map((warning, index) => (
            <View key={index} style={styles.warningItem}>
              <Text style={styles.warningBullet}>•</Text>
              <Text style={styles.warningText}>{warning}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.expertCard}>
        <Text style={styles.expertTitle}>🩺 When to Consult an Expert</Text>
        {treatment.when_to_consult_expert.map((item, index) => (
          <Text key={index} style={styles.expertItem}>• {item}</Text>
        ))}
      </Card>

      {treatment.citations && treatment.citations.length > 0 && (
        <Card>
          <Text style={styles.sectionTitle}>📚 Sources & Citations</Text>
          <Text style={styles.citationSubtitle}>
            This guidance is based on the following sources:
          </Text>
          {treatment.citations.map((citation, index) => (
            <View key={index} style={styles.citationCard}>
              <Text style={styles.citationTitle}>{citation.title}</Text>
              <Text style={styles.citationSource}>Source: {citation.source}</Text>
              <Text style={styles.citationSnippet}>{citation.snippet}</Text>
            </View>
          ))}
        </Card>
      )}

      <Card style={styles.disclaimerCard}>
        <Text style={styles.disclaimerIcon}>⚕️</Text>
        <Text style={styles.disclaimerText}>
          <Text style={styles.disclaimerBold}>Disclaimer:</Text> This guidance is for 
          informational purposes only. Always consult with a qualified horticulturist or 
          plant expert before applying any treatment, especially if you're unsure about 
          the diagnosis or have concerns about plant safety.
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666',
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  treatmentIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  diseaseTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  typeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  typeBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  sectionText: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
  },
  stepCard: {
    backgroundColor: '#f9f9f9',
    padding: 14,
    borderRadius: 8,
    marginBottom: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  stepDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  stepMeta: {
    flexDirection: 'row',
    gap: 15,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaIcon: {
    fontSize: 14,
    marginRight: 5,
  },
  metaText: {
    fontSize: 13,
    color: '#666',
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 6,
  },
  warningSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  warningItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  warningBullet: {
    fontSize: 16,
    color: '#E65100',
    marginRight: 8,
    marginTop: 2,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  expertCard: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  expertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  expertText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  expertItem: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: '#F3E5F5',
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#7B1FA2',
    marginBottom: 10,
  },
  tipItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  tipBullet: {
    fontSize: 16,
    color: '#7B1FA2',
    marginRight: 8,
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  citationSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  citationCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#2196F3',
  },
  citationTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  citationSource: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  citationSnippet: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  dosageCard: {
    backgroundColor: '#F5F5F5',
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  disclaimerCard: {
    backgroundColor: '#E3F2FD',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  disclaimerIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  disclaimerBold: {
    fontWeight: 'bold',
  },
});
