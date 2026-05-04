import { useRouter } from 'expo-router';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.iconWrapper}>
          <Text style={styles.iconEmoji}>🌿</Text>
        </View>

        <Text style={styles.title}>Aloe Maturity</Text>
        <Text style={styles.subtitle}>AI-Powered Plant Scanner</Text>

        <View style={styles.descCard}>
          <View style={styles.descRow}>
            <Text style={styles.descIcon}>🔍</Text>
            <Text style={styles.descItem}>Close-up CNN texture analysis</Text>
          </View>
          <View style={styles.descRow}>
            <Text style={styles.descIcon}>📐</Text>
            <Text style={styles.descItem}>Geometric size measurement</Text>
          </View>
          <View style={styles.descRow}>
            <Text style={styles.descIcon}>🧠</Text>
            <Text style={styles.descItem}>Ensemble prediction engine</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => router.push('/maturity/camera')}
          activeOpacity={0.85}
        >
          <Text style={styles.startButtonText}>Start Scan</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Point your camera at an aloe plant{'\n'}to assess its maturity level
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
    backgroundColor: '#F8F9FA',
  },
  iconWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 22,
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconEmoji: { fontSize: 56 },
  title: { color: '#2E7D32', fontSize: 34, fontWeight: 'bold', letterSpacing: 1, marginBottom: 6 },
  subtitle: { color: '#666', fontSize: 15, marginBottom: 36 },
  descCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 36,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  descRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  descIcon: {
    fontSize: 16,
    width: 28,
    textAlign: 'center',
    marginRight: 8,
  },
  descItem: { color: '#444', fontSize: 14, lineHeight: 20, flex: 1 },
  startButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 14,
    marginBottom: 24,
    shadowColor: '#2E7D32',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  startButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold', letterSpacing: 0.5 },
  footer: { color: '#888', fontSize: 13, textAlign: 'center', lineHeight: 20 },
});