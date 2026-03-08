import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient as ExpoLinearGradient } from 'expo-linear-gradient';
import Button from '../components/Button';
import Card from '../components/Card';

export default function HomeScreen() {
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
          <View style={styles.logoContainer}>
            <Image 
              source={require('../assets/logo.jpeg')}
              style={styles.logo}
              resizeMode="cover"
            />
          </View>
          <Text style={styles.title}>Aloe Mate</Text>
          <View style={styles.taglineContainer}>
            <Text style={styles.subtitle}>AI-Powered Plant Health Assistant</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>✨ Smart Detection</Text>
            </View>
          </View>
        </View>
      </ExpoLinearGradient>
      
      <ScrollView contentContainerStyle={styles.container}>
        
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Aloe Vera Toolkit</Text>
          <Text style={styles.sectionSubtitle}>Choose a module to get started</Text>
        </View>

        <View style={styles.modulesGrid}>
          {/* Module 1: Disease Detection & Treatment */}
          <Card style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>🔬</Text>
              </View>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>AI</Text>
              </View>
            </View>
            <Text style={styles.moduleTitle}>Disease Detection & Treatment</Text>
            <Text style={styles.moduleDescription}>
              Diagnose plant diseases using AI-powered image analysis and get personalized treatment plans.
            </Text>
            <Button
              title="Open"
              onPress={() => router.push('/capture-guide')}
              variant="gradient"
              style={styles.moduleButton}
            />
          </Card>

          {/* Module 2: IoT Monitoring & Disease Risk */}
          <Card style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📡</Text>
              </View>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>IoT</Text>
              </View>
            </View>
            <Text style={styles.moduleTitle}>IoT Monitoring & Disease Risk</Text>
            <Text style={styles.moduleDescription}>
              Real-time environmental monitoring with predictive disease risk alerts.
            </Text>
            <Button
              title="Open"
              onPress={() => router.push('/monitor/dashboard')}
              variant="gradient"
              style={styles.moduleButton}
            />
          </Card>

          {/* Module 3: Care Plan + Chatbot */}
          <Card style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>💬</Text>
              </View>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>Chat</Text>
              </View>
            </View>
            <Text style={styles.moduleTitle}>Care Plan + Chatbot</Text>
            <Text style={styles.moduleDescription}>
              Get personalized care schedules and expert advice through our AI assistant.
            </Text>
            <Button
              title="Open"
              onPress={() => router.push('/care-plan/overview')}
              variant="gradient"
              style={styles.moduleButton}
            />
          </Card>

          {/* Module 4: Harvest & Market Insights */}
          <Card style={styles.moduleCard}>
            <View style={styles.moduleHeader}>
              <View style={styles.moduleIcon}>
                <Text style={styles.moduleIconText}>📊</Text>
              </View>
              <View style={styles.moduleBadge}>
                <Text style={styles.moduleBadgeText}>Market</Text>
              </View>
            </View>
            <Text style={styles.moduleTitle}>Harvest & Market Insights</Text>
            <Text style={styles.moduleDescription}>
              Track harvest readiness and get real-time market price recommendations.
            </Text>
            <Button
              title="Open"
              onPress={() => router.push('/(tabs)/harvest')}
              variant="gradient"
              style={styles.moduleButton}
            />
          </Card>
        </View>

      <Card style={styles.tipsCard}>
        <View style={styles.tipsHeader}>
          <Text style={styles.tipsIcon}>💡</Text>
          <Text style={styles.tipsTitle}>Quick Tips</Text>
        </View>
        <View style={styles.tipsList}>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>✓</Text>
            <Text style={styles.tipText}>Use bright, natural lighting for photos</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>✓</Text>
            <Text style={styles.tipText}>Check IoT sensors daily for alerts</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>✓</Text>
            <Text style={styles.tipText}>Follow care schedules consistently</Text>
          </View>
          <View style={styles.tipRow}>
            <Text style={styles.tipBullet}>✓</Text>
            <Text style={styles.tipText}>Monitor market trends weekly</Text>
          </View>
        </View>
      </Card>
      </ScrollView>
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
    paddingBottom: 50,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  header: {
    alignItems: 'center',
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emoji: {
    fontSize: 48,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 12,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  taglineContainer: {
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#E8F5E9',
    textAlign: 'center',
    fontWeight: '500',
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 24,
  },
  sectionHeader: {
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#78909C',
    fontWeight: '500',
  },
  modulesGrid: {
    gap: 16,
    marginBottom: 24,
  },
  moduleCard: {
    marginTop: 0,
    marginBottom: 0,
  },
  moduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIconText: {
    fontSize: 32,
  },
  moduleBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  moduleBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 20,
    marginBottom: 16,
  },
  moduleButton: {
    marginVertical: 0,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#78909C',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  featureCard: {
    marginTop: 0,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadgeText: {
    fontSize: 24,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#66BB6A',
  },
  cardText: {
    fontSize: 15,
    color: '#546E7A',
    lineHeight: 24,
  },
  stepContainer: {
    gap: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  stepNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  stepContent: {
    flex: 1,
    paddingTop: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#263238',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: '#78909C',
    lineHeight: 20,
  },
  step: {
    fontSize: 15,
    color: '#555',
    lineHeight: 24,
  },
  mainButton: {
    marginVertical: 10,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 6,
    lineHeight: 20,
  },
  tipsCard: {
    marginTop: 0,
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  tipsIcon: {
    fontSize: 28,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B5E20',
    flex: 1,
  },
  tipsList: {
    gap: 12,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tipBullet: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: '700',
  },
  tipText: {
    fontSize: 15,
    color: '#546E7A',
    flex: 1,
    lineHeight: 22,
  },
});
