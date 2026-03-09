import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/Button';
import Card from '../../components/Card';

// Simple in-app chatbot with canned aloe vera care responses
const CHAT_RESPONSES: Record<string, string> = {
  default: "I'm your AloeVera Care Assistant 🌿. Ask me about watering, sunlight, disease treatment, or harvesting!",
  water: "Water aloe vera every 2–3 weeks in summer and once a month in winter. Let the soil dry out completely between waterings. Over-watering is the #1 cause of root rot.",
  sun: "Aloe vera thrives in bright indirect sunlight — 6 hours per day is ideal. Avoid direct afternoon sun which can cause sunburn (pale/brown patches).",
  rot: "For root rot: stop watering immediately, remove the plant, cut off all black/brown roots, dust with cinnamon powder (natural fungicide), and repot in fresh dry soil. Resume watering after 1 week.",
  rust: "For aloe rust (orange spots): remove affected leaves, improve air circulation, avoid wetting foliage when watering, and apply a copper-based fungicide spray.",
  harvest: "Harvest outer leaves that are at least 20–25 cm long. Cut close to the stem with a clean sharp knife. Never take more than 3–4 leaves at a time. Let the yellow sap drain before use.",
  fertilizer: "Fertilize sparingly — once in spring and once in summer with a diluted balanced fertilizer (10-40-10). Avoid feeding in winter.",
  soil: "Use a well-draining cactus/succulent mix. You can add perlite (20–30%) to improve drainage. Avoid heavy soils that retain moisture.",
};

function getBotReply(input: string): string {
  const text = input.toLowerCase();
  if (text.includes('water') || text.includes('irrigat')) return CHAT_RESPONSES.water;
  if (text.includes('sun') || text.includes('light')) return CHAT_RESPONSES.sun;
  if (text.includes('rot') || text.includes('root')) return CHAT_RESPONSES.rot;
  if (text.includes('rust') || text.includes('spot') || text.includes('fungus')) return CHAT_RESPONSES.rust;
  if (text.includes('harvest') || text.includes('cut') || text.includes('leaf') || text.includes('leaves')) return CHAT_RESPONSES.harvest;
  if (text.includes('fertil')) return CHAT_RESPONSES.fertilizer;
  if (text.includes('soil') || text.includes('dirt') || text.includes('potting')) return CHAT_RESPONSES.soil;
  return "Great question! For best results, diagnose your plant using the Diagnose tab, then I can give you targeted advice. You can also ask me about: watering, sunlight, root rot, rust, harvesting, fertilizer, or soil. 🌱";
}

interface Message { id: number; from: 'user' | 'bot'; text: string; }

export default function CarePlanOverviewScreen() {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'bot', text: CHAT_RESPONSES.default },
  ]);
  const [inputText, setInputText] = useState('');

  function sendMessage() {
    const text = inputText.trim();
    if (!text) return;
    const userMsg: Message = { id: Date.now(), from: 'user', text };
    const botMsg: Message = { id: Date.now() + 1, from: 'bot', text: getBotReply(text) };
    setMessages(prev => [...prev, userMsg, botMsg]);
    setInputText('');
  }

  function handleCreateCarePlan() {
    Alert.alert(
      'Create Care Plan',
      'First diagnose your plant to get a personalised treatment plan, or scroll down to use the Harvest Yield Predictor for farm planning.',
      [
        { text: 'Go to Diagnose', onPress: () => router.push('/(tabs)/diagnose' as any) },
        { text: 'Later', style: 'cancel' },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Button title="← Back" onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.title}>Care Plan Overview</Text>
        <Text style={styles.subtitle}>Personalized Plant Care Management</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Active Treatment Plans */}
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

        {/* Quick Actions */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚡</Text>
            <Text style={styles.cardTitle}>Quick Actions</Text>
          </View>
          <View style={styles.actionsGrid}>
            <Button
              title="Create Care Plan"
              onPress={handleCreateCarePlan}
              variant="gradient"
              style={styles.actionButton}
              icon="➕"
            />
            <Button
              title="Open Chatbot"
              onPress={() => setChatOpen(true)}
              variant="gradient"
              style={styles.actionButton}
              icon="💬"
            />
          </View>
        </Card>

        {/* Sample Care Plans */}
        <Card style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📝</Text>
            <Text style={styles.cardTitle}>Sample Care Plans</Text>
          </View>
          <View style={styles.samplePlan}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Root Rot Treatment</Text>
              <View style={styles.planBadge}><Text style={styles.planBadgeText}>7 days</Text></View>
            </View>
            <Text style={styles.planDescription}>
              • Reduce watering frequency{'\n'}• Improve drainage{'\n'}• Apply fungicide treatment{'\n'}• Monitor daily for 1 week
            </Text>
          </View>
          <View style={[styles.samplePlan, styles.planMarginTop]}>
            <View style={styles.planHeader}>
              <Text style={styles.planTitle}>Bacterial Soft Rot Care</Text>
              <View style={styles.planBadge}><Text style={styles.planBadgeText}>14 days</Text></View>
            </View>
            <Text style={styles.planDescription}>
              • Remove infected parts{'\n'}• Apply copper-based spray{'\n'}• Increase air circulation{'\n'}• Weekly progress checks
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
            Get instant answers to your aloe vera care questions. Ask about watering, sunlight, disease treatment, soil, and more.
          </Text>
          <Button
            title="Chat with AI Assistant"
            onPress={() => setChatOpen(true)}
            variant="gradient"
            style={styles.button}
            icon="💬"
          />
        </Card>

        {/* Harvest Yield Prediction Card */}
        <Card style={styles.yieldCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>⚖️</Text>
            <Text style={styles.cardTitle}>Harvest Yield Prediction</Text>
          </View>
          <Text style={styles.yieldDescription}>
            Predict your Aloe Vera harvest yield in kilograms based on your farm details. Live weather data for your district is fetched automatically.
          </Text>
          <Button
            title="Predict Harvest Yield"
            onPress={() => router.push('/harvest-yield' as any)}
            variant="gradient"
            style={styles.button}
            icon="🌿"
          />
        </Card>

        {/* Diagnose shortcut */}
        <Card style={styles.diagnoseCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>🔬</Text>
            <Text style={styles.cardTitle}>Diagnose Your Plant</Text>
          </View>
          <Text style={styles.yieldDescription}>
            Take photos of your plant to detect diseases and receive a step-by-step treatment plan.
          </Text>
          <Button
            title="Start Diagnosis"
            onPress={() => router.push('/(tabs)/diagnose' as any)}
            variant="gradient"
            style={styles.button}
            icon="📷"
          />
        </Card>

      </ScrollView>

      {/* Chatbot Modal */}
      <Modal visible={chatOpen} animationType="slide" onRequestClose={() => setChatOpen(false)}>
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.chatHeader}>
            <Text style={styles.chatTitle}>🤖 AloeVera Care Assistant</Text>
            <TouchableOpacity onPress={() => setChatOpen(false)} style={styles.chatClose}>
              <Text style={styles.chatCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.chatMessages} contentContainerStyle={{ padding: 16, paddingBottom: 8 }}>
            {messages.map(msg => (
              <View key={msg.id} style={[styles.bubble, msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={msg.from === 'user' ? styles.bubbleUserText : styles.bubbleBotText}>{msg.text}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about watering, sunlight, diseases…"
              returnKeyType="send"
              onSubmitEditing={sendMessage}
            />
            <TouchableOpacity onPress={sendMessage} style={styles.sendBtn}>
              <Text style={styles.sendBtnText}>Send</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  yieldCard: {
    backgroundColor: '#F1F8E9',
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  yieldDescription: {
    fontSize: 15,
    color: '#33691E',
    lineHeight: 22,
    marginBottom: 16,
  },
  diagnoseCard: {
    backgroundColor: '#E3F2FD',
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#1976D2',
  },
  // Chatbot modal styles
  chatContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#1B5E20',
  },
  chatTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  chatClose: {
    padding: 8,
  },
  chatCloseText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: '700',
  },
  chatMessages: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  bubble: {
    maxWidth: '80%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#4CAF50',
  },
  bubbleBot: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bubbleUserText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleBotText: {
    color: '#1B5E20',
    fontSize: 15,
    lineHeight: 21,
  },
  chatInputRow: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
    gap: 8,
  },
  chatInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#F1F8E9',
  },
  sendBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
