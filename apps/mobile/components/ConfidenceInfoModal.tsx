import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  ScrollView, 
  TouchableOpacity,
  Pressable 
} from 'react-native';

interface ConfidenceInfoModalProps {
  visible: boolean;
  onClose: () => void;
  currentConfidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export default function ConfidenceInfoModal({ 
  visible, 
  onClose, 
  currentConfidence 
}: ConfidenceInfoModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.title}>Understanding Confidence Levels</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* High Confidence */}
            <View style={[styles.section, currentConfidence === 'HIGH' && styles.activeSection]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.badge, styles.highBadge]}>
                  <Text style={styles.badgeText}>✓ HIGH</Text>
                </View>
                {currentConfidence === 'HIGH' && (
                  <Text style={styles.currentLabel}>Current</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Very Likely Correct</Text>
              <Text style={styles.sectionDescription}>
                The model is very confident about this diagnosis. You can safely follow the treatment guidance provided.
              </Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>
                  ✓ Confidence ≥80%{'\n'}
                  ✓ Clear symptoms detected{'\n'}
                  ✓ High-quality images provided
                </Text>
              </View>
            </View>

            {/* Medium Confidence */}
            <View style={[styles.section, currentConfidence === 'MEDIUM' && styles.activeSection]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.badge, styles.mediumBadge]}>
                  <Text style={styles.badgeText}>! MEDIUM</Text>
                </View>
                {currentConfidence === 'MEDIUM' && (
                  <Text style={styles.currentLabel}>Current</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Likely, But Not Certain</Text>
              <Text style={styles.sectionDescription}>
                The diagnosis is probable, but consider taking additional clearer photos or consulting an expert for confirmation.
              </Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>
                  ⚠ Confidence 60-79%{'\n'}
                  ⚠ Some symptoms unclear{'\n'}
                  💡 Consider retaking photos
                </Text>
              </View>
            </View>

            {/* Low Confidence */}
            <View style={[styles.section, currentConfidence === 'LOW' && styles.activeSection]}>
              <View style={styles.sectionHeader}>
                <View style={[styles.badge, styles.lowBadge]}>
                  <Text style={styles.badgeText}>? LOW</Text>
                </View>
                {currentConfidence === 'LOW' && (
                  <Text style={styles.currentLabel}>Current</Text>
                )}
              </View>
              <Text style={styles.sectionTitle}>Not Reliable</Text>
              <Text style={styles.sectionDescription}>
                The model cannot provide a reliable diagnosis. Please retake photos with better lighting and focus for accurate results.
              </Text>
              <View style={styles.detailBox}>
                <Text style={styles.detailText}>
                  ✗ Confidence &lt;60%{'\n'}
                  ✗ Symptoms not clear{'\n'}
                  📷 Must retake photos
                </Text>
              </View>
            </View>

            {/* Why Might It Be Uncertain */}
            <View style={styles.reasonsSection}>
              <Text style={styles.reasonsTitle}>🤔 Why might it be uncertain?</Text>
              <View style={styles.reasonsList}>
                <Text style={styles.reason}>📷 Blurry or out-of-focus image</Text>
                <Text style={styles.reason}>🌑 Low light or poor lighting conditions</Text>
                <Text style={styles.reason}>📏 Camera too far or too close to plant</Text>
                <Text style={styles.reason}>🎨 Background clutter or distractions</Text>
                <Text style={styles.reason}>👁️ Symptoms not clearly visible</Text>
                <Text style={styles.reason}>💧 Water droplets or reflections on leaves</Text>
                <Text style={styles.reason}>📐 Awkward angle making details hard to see</Text>
              </View>
            </View>

            {/* Tips for Better Results */}
            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips for High Confidence Results</Text>
              <View style={styles.tipsList}>
                <Text style={styles.tip}>✓ Take photos in bright, natural daylight</Text>
                <Text style={styles.tip}>✓ Focus clearly on affected areas</Text>
                <Text style={styles.tip}>✓ Hold camera steady, avoid motion blur</Text>
                <Text style={styles.tip}>✓ Get close enough to see details</Text>
                <Text style={styles.tip}>✓ Clean your camera lens first</Text>
                <Text style={styles.tip}>✓ Capture all 3 angles (close-up, whole plant, base)</Text>
              </View>
            </View>

            {/* Close Button */}
            <TouchableOpacity style={styles.button} onPress={onClose}>
              <Text style={styles.buttonText}>Got It</Text>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    fontSize: 20,
    color: '#666',
    fontWeight: 'bold',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    borderRadius: 12,
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeSection: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
  },
  highBadge: {
    backgroundColor: '#4CAF50',
  },
  mediumBadge: {
    backgroundColor: '#FF9800',
  },
  lowBadge: {
    backgroundColor: '#F44336',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentLabel: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: 'bold',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
    marginBottom: 10,
  },
  detailBox: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  detailText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  reasonsSection: {
    marginTop: 10,
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
  },
  reasonsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  reasonsList: {
    gap: 8,
  },
  reason: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    paddingLeft: 5,
  },
  tipsSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tip: {
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    paddingLeft: 5,
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
