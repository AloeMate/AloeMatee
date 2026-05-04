import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Button from '../components/Button';
import Card from '../components/Card';
import ConfidenceBadge from '../components/ConfidenceBadge';
import ConfidenceInfoModal from '../components/ConfidenceInfoModal';
import ErrorMessage from '../components/ErrorMessage';

interface DiseasePrediction {
  disease_id: string;
  disease_name: string;
  prob: number;
}

interface DiseaseResponse {
  request_id: string;
  predictions: DiseasePrediction[];
  confidence_status: 'HIGH' | 'MEDIUM' | 'LOW';
  recommended_next_step: 'RETAKE' | 'SHOW_TREATMENT';
  symptoms_summary: string;
  inference_stage?: 'main' | 'fallback' | 'vision_api' | 'not_aloe';
  confidence?: number;
  message?: string;
  retake_message?: string;
}

export default function ResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showConfidenceInfo, setShowConfidenceInfo] = useState(false);

  const result: DiseaseResponse = params.result 
    ? JSON.parse(params.result as string) 
    : null;

  if (!result) {
    return (
      <View style={styles.container}>
        <ErrorMessage
          title="No Results"
          message="Unable to load analysis results."
          type="error"
        />
      </View>
    );
  }

  const topPrediction = result.predictions[0];
  const confidenceStatus = result.confidence_status;
  const confidenceLevel = confidenceStatus === 'HIGH' 
    ? 'High' 
    : confidenceStatus === 'MEDIUM' 
    ? 'Medium' 
    : 'Low';

  const isUnknownPlant =
    topPrediction.disease_id === 'unknown' ||
    topPrediction.disease_name.toLowerCase().includes('unknown');

  const isFallbackResult = result.inference_stage === 'fallback';
  const isVisionApiResult = result.inference_stage === 'vision_api';
  const isNotAloeStage = result.inference_stage === 'not_aloe';

  const showLowConfidencePage = false; // deprecated: always show result panel
  const lowCertainty = topPrediction.prob < 0.35;

  const handleTreatment = (treatmentType: 'scientific' | 'ayurvedic') => {
    router.push({
      pathname: '/treatment',
      params: {
        diseaseId: topPrediction.disease_id,
        diseaseName: topPrediction.disease_name,
        treatmentType,
      },
    });
  };

  const handleRetake = () => {
    router.replace('/camera-capture');
  };

  // Note: low confidence warning page removed. We'll always show the result
  // panel. When the top prediction probability is below 0.35, the UI will
  // display a small yellow "Low Certainty" badge and a short note below the
  // result encouraging the user to retake a clearer photo.

  if (isUnknownPlant) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={styles.unknownCard}>
          <Text style={styles.unknownIcon}>❓</Text>
          <Text style={styles.unknownTitle}>Unknown / Not Aloe Vera</Text>
          <Text style={styles.unknownSubtitle}>
            The model cannot confidently identify this as aloe vera. Please try again with a clearer aloe plant photo.
          </Text>
        </Card>

        <Card style={styles.whyCard}>
          <Text style={styles.whyTitle}>What this means</Text>
          <Text style={styles.whyItem}>• The plant image may not show aloe vera clearly.</Text>
          <Text style={styles.whyItem}>• The detected features are outside the aloe disease set.</Text>
          <Text style={styles.whyItem}>• Retaking photos with better focus and lighting helps.</Text>
        </Card>

        <Button
          title="📷 Retake Photos"
          onPress={handleRetake}
          variant="warning"
          style={styles.button}
        />
      </ScrollView>
    );
  }

  // Medium or High confidence - show full results
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ConfidenceInfoModal
        visible={showConfidenceInfo}
        onClose={() => setShowConfidenceInfo(false)}
        currentConfidence={confidenceStatus}
      />

      <Card style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <ConfidenceBadge 
                status={confidenceLevel as any} 
                confidence={topPrediction.prob}
                onInfoPress={() => setShowConfidenceInfo(true)}
              />
            </View>
            <Text style={styles.mainDisease}>{topPrediction.disease_name}</Text>
        {(isFallbackResult || isVisionApiResult) && (
          <View style={isVisionApiResult ? styles.visionBadge : styles.fallbackBadge}>
            <Text style={isVisionApiResult ? styles.visionBadgeText : styles.fallbackBadgeText}>
              {isVisionApiResult ? 'Google Vision AI' : 'Enhanced Detection'}
            </Text>
          </View>
        )}
        {result.symptoms_summary && (
          <Text style={styles.description}>{result.symptoms_summary}</Text>
        )}
        {lowCertainty && (
          <Text style={styles.lowCertaintyNote}>Take a clearer photo for better accuracy</Text>
        )}
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>🔬 Top Predictions:</Text>
        {result.predictions.map((prediction, index) => (
          <View key={prediction.disease_id} style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
              <Text style={styles.rank}>#{index + 1}</Text>
              <Text style={styles.diseaseName}>{prediction.disease_name}</Text>
            </View>

            <View style={styles.confidenceBar}>
              <View 
                style={[
                  styles.confidenceFill, 
                  { width: `${prediction.prob * 100}%` }
                ]} 
              />
            </View>

            <View style={styles.confidenceLabel}>
              <Text style={styles.confidenceText}>Confidence</Text>
              <Text style={styles.confidenceValue}>
                {(prediction.prob * 100).toFixed(1)}%
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {confidenceLevel === 'Medium' && (
        <Card style={styles.warningCard}>
          <Text style={styles.warningIcon}>ℹ️</Text>
          <Text style={styles.warningText}>
            Moderate confidence. Treatment recommendations provided, but consider consulting an expert for confirmation.
          </Text>
        </Card>
      )}

      <Card>
        <Text style={styles.treatmentTitle}>💊 Choose Treatment Approach:</Text>
        <Text style={styles.treatmentSubtitle}>
          Select your preferred treatment method based on your needs
        </Text>

        <Button
          title="🔬 Scientific Treatment"
          onPress={() => handleTreatment('scientific')}
          variant="secondary"
          style={styles.treatmentButton}
        />
        <Text style={styles.treatmentDescription}>
          Evidence-based medical approach with proven chemical treatments and modern techniques
        </Text>

        <Button
          title="🌿 Ayurvedic Treatment"
          onPress={() => handleTreatment('ayurvedic')}
          variant="success"
          style={styles.treatmentButton}
        />
        <Text style={styles.treatmentDescription}>
          Traditional herbal remedies and natural healing methods from ancient wisdom
        </Text>
      </Card>

      <Button
        title="📷 Retake Photos"
        onPress={handleRetake}
        variant="warning"
        style={styles.button}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  statusCard: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  mainDisease: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  predictionCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  rank: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginRight: 10,
    width: 30,
  },
  diseaseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  confidenceBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  confidenceFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  confidenceLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
  },
  confidenceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  predictionDescription: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    lineHeight: 18,
  },
  warningCard: {
    backgroundColor: '#FFF3E0',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  warningIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 14,
    color: '#E65100',
    lineHeight: 20,
  },
  treatmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  treatmentSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  treatmentButton: {
    marginBottom: 8,
  },
  treatmentDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 20,
    paddingHorizontal: 4,
    lineHeight: 18,
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
  // Low confidence styles
  uncertainCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#FFF3E0',
  },
  uncertainIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  uncertainTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
    marginBottom: 12,
  },
  uncertainSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  retakeTipsCard: {
    backgroundColor: '#E3F2FD',
  },
  retakeTipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  retakeTipsSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  retakeTip: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  retakeTipNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 32,
    marginRight: 12,
  },
  retakeTipContent: {
    flex: 1,
  },
  retakeTipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  retakeTipText: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  unknownCard: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#E8F5E9',
  },
  unknownIcon: {
    fontSize: 48,
    marginBottom: 10,
  },
  unknownTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 12,
  },
  unknownSubtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  fallbackBadge: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  fallbackBadgeText: {
    color: '#1565C0',
    fontWeight: '700',
    fontSize: 12,
  },
  visionBadge: {
    marginTop: 8,
    alignSelf: 'center',
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  visionBadgeText: {
    color: '#7B1FA2',
    fontWeight: '700',
    fontSize: 12,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lowCertaintyNote: {
    marginTop: 10,
    fontSize: 13,
    color: '#E65100',
    textAlign: 'center',
  },
  whyCard: {
    backgroundColor: '#FFF9E6',
  },
  whyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  whyList: {
    gap: 10,
  },
  whyItem: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
  },
  technicalCard: {
    backgroundColor: '#f5f5f5',
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
  },
  retakeMessageText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  tipContainer: {
    gap: 12,
  },
  tip: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  tipBold: {
    fontWeight: 'bold',
    color: '#333',
  },
  uncertainPrediction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  uncertainRank: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#999',
    width: 30,
  },
  uncertainInfo: {
    flex: 1,
  },
  uncertainName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  uncertainConfidence: {
    fontSize: 13,
    color: '#666',
  },
});
