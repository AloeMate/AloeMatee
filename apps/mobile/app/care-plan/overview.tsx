import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/Button';
import Card from '../../components/Card';

export default function CarePlanOverviewScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Button
          title="← Back"
          onPress={() => router.back()}
          style={styles.backButton}
        />
        <Text style={styles.title}>Care Plan Overview</Text>
        <Text style={styles.subtitle}>Personalized Plant Care Management</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        {/* Active Treatment Plans Card */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>Your Active Treatment Plans</Text>
          </View>
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateIcon}>🌱</Text>
            <Text style={styles.emptyStateText}>No active treatment plans yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Create a plan after diagnosing your plant or get personalized recommendations from our chatbot
            </Text>
          </View>
        </Card>

        {/* Quick Actions Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            <Button
              title="Create Care Plan"
              onPress={() => {}}
              variant="gradient"
              style={styles.actionButton}
              icon="➕"
            />
            <Button
              title="Open Chatbot"
              onPress={() => {}}
              variant="gradient"
              style={styles.actionButton}
              icon="💬"
            />
          </View>
        </Card>

        {/* Sample Care Plans Card */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>Sample Care Plans</Text>
          </View>
          <View style={styles.samplePlan}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Root Rot Treatment</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>7 days</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>
              • Reduce watering frequency{'\n'}
              • Improve drainage{'\n'}
              • Apply fungicide treatment{'\n'}
              • Monitor daily for 1 week
            </Text>
          </View>
          <View style={[styles.samplePlan, styles.planMarginTop]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Bacterial Soft Rot Care</Text>
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>14 days</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>
              • Remove infected parts{'\n'}
              • Apply copper-based spray{'\n'}
              • Increase air circulation{'\n'}
              • Weekly progress checks
            </Text>
          </View>
        </Card>

        {/* AI Chatbot Card */}
        <Card style={styles.chatbotCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🤖</Text>
            <Text style={styles.cardTitle}>AI Care Assistant</Text>
          </View>
          <Text style={styles.chatbotDescription}>
            Get instant answers to your aloe vera care questions. Our AI chatbot provides personalized advice based on your plant's condition.
          </Text>
          <Button
            title="Chat with AI Assistant"
            onPress={() => {}}
            variant="gradient"
            style={styles.button}
            icon="💬"
          />
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.infoTitle}>Coming Soon</Text>
          <Text style={styles.infoText}>• Custom care schedule builder</Text>
          <Text style={styles.infoText}>• Treatment progress tracking</Text>
          <Text style={styles.infoText}>• AI chatbot with plant knowledge</Text>
          <Text style={styles.infoText}>• Push notifications for care tasks</Text>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#78909C',
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  sectionCard: {
    marginTop: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B5E20',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#546E7A',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsGrid: {
    gap: 12,
  },
  actionButton: {
    marginVertical: 0,
  },
  samplePlan: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
  },
  planMarginTop: {
    marginTop: 12,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B5E20',
  },
  planBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  planDescription: {
    fontSize: 14,
    color: '#546E7A',
    lineHeight: 22,
  },
  chatbotCard: {
    backgroundColor: '#E8F5E9',
    marginTop: 16,
  },
  chatbotDescription: {
    fontSize: 15,
    color: '#1B5E20',
    lineHeight: 22,
    marginBottom: 16,
  },
  button: {
    marginVertical: 0,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 15,
    color: '#1B5E20',
    marginBottom: 6,
    lineHeight: 22,
  },
});
