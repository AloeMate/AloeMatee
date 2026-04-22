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
  retake_message?: string;
  is_aloe_vera?: boolean;
  not_aloe_vera_message?: string;
}

type SeverityLevel = 'Mild' | 'Moderate' | 'Severe';

function getSeverityLevel(prob: number): SeverityLevel {
  if (prob >= 0.85) return 'Mild';
  if (prob >= 0.6) return 'Moderate';
  return 'Severe';
}

function getSeverityColor(level: SeverityLevel): string {
  if (level === 'Mild') return '#2E7D32';
  if (level === 'Moderate') return '#EF6C00';
  return '#C62828';
}

function getLowConfidenceReasons(message?: string): string[] {
  const text = (message || '').toLowerCase();
  const reasons: string[] = [];

  if (text.includes('blur') || text.includes('focus')) reasons.push('Image is blurry or out of focus');
  if (text.includes('light') || text.includes('dark') || text.includes('shadow')) reasons.push('Lighting quality is low');
  if (text.includes('distance') || text.includes('close') || text.includes('far')) reasons.push('Camera distance is not ideal');
  if (text.includes('background') || text.includes('clutter')) reasons.push('Background is distracting');

  if (reasons.length === 0) {
    reasons.push('Symptoms are not clearly visible');
    reasons.push('Photo angle or framing is not optimal');
  }

  return reasons;
}

function getActionTimeline(level: SeverityLevel): { title: string; detail: string }[] {
  if (level === 'Severe') {
    return [
      { title: 'Next 24 hours', detail: 'Isolate the plant and begin treatment immediately.' },
      { title: 'Next 3 days', detail: 'Track symptom spread daily and remove heavily affected tissue.' },
      { title: 'Next 7 days', detail: 'Reassess with fresh photos and consult an expert if symptoms persist.' },
    ];
  }

  if (level === 'Moderate') {
    return [
      { title: 'Next 24 hours', detail: 'Start the selected treatment and optimize watering/airflow.' },
      { title: 'Next 3 days', detail: 'Check lesion size and color changes once per day.' },
      { title: 'Next 7 days', detail: 'Upload follow-up photos to confirm recovery trend.' },
    ];
  }

  return [
    { title: 'Next 24 hours', detail: 'Apply early-stage treatment and keep plant in stable conditions.' },
    { title: 'Next 3 days', detail: 'Observe any new spots while maintaining routine care.' },
    { title: 'Next 7 days', detail: 'Retake photos only if symptoms increase or spread.' },
  ];
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
  const severityLevel = getSeverityLevel(topPrediction.prob);
  const severityColor = getSeverityColor(severityLevel);
  const lowConfidenceReasons = getLowConfidenceReasons(result.retake_message);
  const actionTimeline = getActionTimeline(severityLevel);

  const handleTreatment = (treatmentType: 'scientific' | 'ayurvedic') => {
    router.push({
      pathname: '/treatment',
      params: {
        diseaseId: topPrediction.disease_id,
        diseaseName: topPrediction.disease_name,
        treatmentType,
        confidenceStatus: confidenceStatus,
        severityLevel,
      },
    });
  };

  const handleRetake = () => {
    router.replace('/camera-capture');
  };

  // Not aloe vera — show dedicated screen
  if (result.is_aloe_vera === false) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Card style={[styles.uncertainCard, { borderColor: '#FF6B35', borderWidth: 2 }]}>
          <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🌵</Text>
          <Text style={[styles.uncertainTitle, { color: '#FF6B35' }]}>Not an Aloe Vera Plant</Text>
          <Text style={[styles.uncertainSubtitle, { marginTop: 12 }]}>
            {result.not_aloe_vera_message ||
              'This app is designed specifically for aloe vera disease detection. Please photograph an aloe vera plant and try again.'}
          </Text>
        </Card>

        <Card style={styles.retakeTipsCard}>
          <Text style={styles.retakeTipsTitle}>📸 What to photograph</Text>
          <View style={styles.retakeTip}>
            <Text style={styles.retakeTipNumber}>1</Text>
            <View style={styles.retakeTipContent}>
              <Text style={styles.retakeTipTitle}>🌿 Aloe Vera Leaf</Text>
              <Text style={styles.retakeTipText}>Make sure the plant is aloe vera — thick, fleshy triangular leaves with serrated edges.</Text>
            </View>
          </View>
          <View style={styles.retakeTip}>
            <Text style={styles.retakeTipNumber}>2</Text>
            <View style={styles.retakeTipContent}>
              <Text style={styles.retakeTipTitle}>🎯 Focus on the Affected Area</Text>
              <Text style={styles.retakeTipText}>Capture close-up photos of leaves showing discolouration, spots, or damage.</Text>
            </View>
          </View>
        </Card>

        <Button title="Try Again" onPress={handleRetake} style={styles.retakeButton} />
      </ScrollView>
    );
  }

  // Low confidence - suggest retake
  if (result.recommended_next_step === 'RETAKE') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <ConfidenceInfoModal
          visible={showConfidenceInfo}
          onClose={() => setShowConfidenceInfo(false)}
          currentConfidence="LOW"
        />

        <Card style={styles.uncertainCard}>
          <Text style={styles.uncertainIcon}>⚠️</Text>
          <Text style={styles.uncertainTitle}>Low Confidence Detection</Text>
          <ConfidenceBadge 
            status="Low" 
            confidence={topPrediction.prob}
            onInfoPress={() => setShowConfidenceInfo(true)}
          />
          <Text style={styles.uncertainSubtitle}>
            We're not confident about this diagnosis. Better photos will help!
          </Text>
        </Card>

        {/* Retake Tips Card */}
        <Card style={styles.retakeTipsCard}>
          <Text style={styles.retakeTipsTitle}>📸 How to Take Better Photos</Text>
          <Text style={styles.retakeTipsSubtitle}>Follow these 3 key tips:</Text>
          
          <View style={styles.retakeTip}>
            <Text style={styles.retakeTipNumber}>1</Text>
            <View style={styles.retakeTipContent}>
              <Text style={styles.retakeTipTitle}>☀️ Good Lighting</Text>
              <Text style={styles.retakeTipText}>
                Take photos in bright, natural daylight. Avoid direct harsh sunlight or shadows.
              </Text>
            </View>
          </View>

          <View style={styles.retakeTip}>
            <Text style={styles.retakeTipNumber}>2</Text>
            <View style={styles.retakeTipContent}>
              <Text style={styles.retakeTipTitle}>🎯 Clear Focus</Text>
              <Text style={styles.retakeTipText}>
                Tap on the affected area to focus. Hold camera steady and wait for image to sharpen.
              </Text>
            </View>
          </View>

          <View style={styles.retakeTip}>
            <Text style={styles.retakeTipNumber}>3</Text>
            <View style={styles.retakeTipContent}>
              <Text style={styles.retakeTipTitle}>📏 Right Distance</Text>
              <Text style={styles.retakeTipText}>
                Get close enough to see details clearly, but not so close that image becomes blurry.
              </Text>
            </View>
          </View>
        </Card>

        {/* Why Low Confidence Card */}
        <Card style={styles.whyCard}>
          <Text style={styles.whyTitle}>🤔 Why might it be uncertain?</Text>
          <View style={styles.whyList}>
            <Text style={styles.whyItem}>📷 Blurry or out-of-focus image</Text>
            <Text style={styles.whyItem}>🌑 Low light or poor lighting</Text>
            <Text style={styles.whyItem}>📏 Camera too far or too close</Text>
            <Text style={styles.whyItem}>🎨 Background clutter</Text>
            <Text style={styles.whyItem}>👁️ Symptoms not clearly visible</Text>
          </View>
        </Card>

        <Card style={styles.reasonCard}>
          <Text style={styles.reasonTitle}>Likely Quality Issues</Text>
          <View style={styles.reasonTags}>
            {lowConfidenceReasons.map((reason) => (
              <View key={reason} style={styles.reasonTag}>
                <Text style={styles.reasonTagText}>{reason}</Text>
              </View>
            ))}
          </View>
        </Card>

        {result.retake_message && (
          <Card style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>Technical Details:</Text>
            <Text style={styles.retakeMessageText}>{result.retake_message}</Text>
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>🔍 What We Detected (Uncertain):</Text>
          {result.predictions.slice(0, 2).map((prediction, index) => (
            <View key={prediction.disease_id} style={styles.uncertainPrediction}>
              <Text style={styles.uncertainRank}>#{index + 1}</Text>
              <View style={styles.uncertainInfo}>
                <Text style={styles.uncertainName}>{prediction.disease_name}</Text>
                <Text style={styles.uncertainConfidence}>
                  {(prediction.prob * 100).toFixed(0)}% confidence
                </Text>
              </View>
            </View>
          ))}
        </Card>

        <Button
          title="📷 Retake Photos"
          onPress={handleRetake}
          variant="warning"
          style={styles.button}
        />

        <Text style={styles.note}>
          Taking clearer photos will help us provide accurate diagnosis and treatment recommendations.
        </Text>
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
        <ConfidenceBadge 
          status={confidenceLevel as any} 
          confidence={topPrediction.prob}
          onInfoPress={() => setShowConfidenceInfo(true)}
        />
        <Text style={styles.mainDisease}>{topPrediction.disease_name}</Text>
        <View style={[styles.severityBadge, { backgroundColor: `${severityColor}22`, borderColor: severityColor }]}> 
          <Text style={[styles.severityBadgeText, { color: severityColor }]}>Severity: {severityLevel}</Text>
        </View>
        {result.symptoms_summary && (
          <Text style={styles.description}>{result.symptoms_summary}</Text>
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

      <Card style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Action Plan Timeline</Text>
        {actionTimeline.map((item) => (
          <View key={item.title} style={styles.timelineRow}>
            <Text style={styles.timelineHeading}>{item.title}</Text>
            <Text style={styles.timelineDetail}>{item.detail}</Text>
          </View>
        ))}
      </Card>

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
  severityBadge: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  severityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
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
  timelineCard: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  timelineTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 10,
  },
  timelineRow: {
    marginBottom: 10,
  },
  timelineHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 2,
  },
  timelineDetail: {
    fontSize: 14,
    color: '#355E3B',
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
  retakeButton: {
    marginTop: 6,
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
  reasonCard: {
    backgroundColor: '#F1F8E9',
  },
  reasonTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#33691E',
    marginBottom: 10,
  },
  reasonTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonTag: {
    backgroundColor: '#DCEDC8',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  reasonTagText: {
    fontSize: 12,
    color: '#33691E',
    fontWeight: '600',
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
