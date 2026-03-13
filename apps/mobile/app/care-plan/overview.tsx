import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Alert, Modal, TextInput,
  KeyboardAvoidingView, Platform, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { sendGeminiMessage, ChatMessage as GeminiChatMessage } from '../../services/gemini';

const WELCOME_MESSAGE = "Hello! I'm your AI-powered Aloe Vera Care Assistant 🌿\n\nI can help you with watering schedules, disease treatment, harvesting tips, soil & fertilizer advice, and much more. What would you like to know today?";

const QUICK_SUGGESTIONS = [
  'How often should I water?',
  'Treating root rot',
  'When to harvest leaves',
  'Best soil for aloe vera',
  'Sunlight requirements',
  'Fertilizer tips',
];

interface Message {
  id: number;
  from: 'user' | 'bot';
  text: string;
  isError?: boolean;
}

export default function CarePlanOverviewScreen() {
  const router = useRouter();
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 0, from: 'bot', text: WELCOME_MESSAGE },
  ]);
  const [geminiHistory, setGeminiHistory] = useState<GeminiChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages, isTyping]);

  async function sendMessage(text?: string) {
    const userText = (text ?? inputText).trim();
    if (!userText || isTyping) return;

    const userMsg: Message = { id: Date.now(), from: 'user', text: userText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const reply = await sendGeminiMessage(userText, geminiHistory);
      const botMsg: Message = { id: Date.now() + 1, from: 'bot', text: reply };
      setMessages(prev => [...prev, botMsg]);
      setGeminiHistory(prev => [
        ...prev,
        { role: 'user', text: userText },
        { role: 'model', text: reply },
      ]);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      const errorMsg: Message = {
        id: Date.now() + 1,
        from: 'bot',
        text: `Sorry, I couldn't get a response right now.\n\n${reason}\n\nPlease try again. 🌿`,
        isError: true,
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleOpenChat() {
    setChatOpen(true);
  }

  function handleCloseChat() {
    setChatOpen(false);
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
              onPress={() => Alert.alert(
                'Create Care Plan',
                'First diagnose your plant to get a personalised treatment plan, or scroll down to use the Harvest Yield Predictor for farm planning.',
                [
                  { text: 'Go to Diagnose', onPress: () => router.push('/(tabs)/diagnose' as any) },
                  { text: 'Later', style: 'cancel' },
                ]
              )}
              variant="gradient"
              style={styles.actionButton}
              icon="➕"
            />
            <Button
              title="Open AI Assistant"
              onPress={handleOpenChat}
              variant="gradient"
              style={styles.actionButton}
              icon="🤖"
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
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>AI Care Assistant</Text>
              <View style={styles.aiBadge}>
                <Text style={styles.aiBadgeText}>✦ Powered by Gemini AI</Text>
              </View>
            </View>
          </View>
          <Text style={styles.chatbotDescription}>
            Ask anything about aloe vera care — watering, diseases, harvesting, soil, and more. Get expert AI-powered answers tailored to your plants.
          </Text>
          <Button
            title="Chat with AI Assistant"
            onPress={handleOpenChat}
            variant="gradient"
            style={styles.button}
            icon="🤖"
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


      </ScrollView>

      {/* Chatbot Modal */}
      <Modal visible={chatOpen} animationType="slide" onRequestClose={handleCloseChat}>
        <KeyboardAvoidingView style={styles.chatContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          {/* Chat Header */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderLeft}>
              <View style={styles.aiAvatarCircle}>
                <Text style={styles.aiAvatarText}>🌿</Text>
              </View>
              <View>
                <Text style={styles.chatTitle}>AI Care Assistant</Text>
                <View style={styles.onlineRow}>
                  <View style={styles.onlineDot} />
                  <Text style={styles.onlineText}>Gemini AI · Online</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={handleCloseChat} style={styles.chatClose}>
              <Text style={styles.chatCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Suggestions */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.suggestionsBar}
            contentContainerStyle={styles.suggestionsContent}
          >
            {QUICK_SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => sendMessage(s)}
                disabled={isTyping}
              >
                <Text style={styles.suggestionChipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Messages */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatMessages}
            contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.bubbleWrapper,
                  msg.from === 'user' ? styles.bubbleWrapperUser : styles.bubbleWrapperBot,
                ]}
              >
                {msg.from === 'bot' && (
                  <View style={styles.botAvatarSmall}>
                    <Text style={styles.botAvatarSmallText}>🌿</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.bubble,
                    msg.from === 'user' ? styles.bubbleUser : styles.bubbleBot,
                    msg.isError && styles.bubbleError,
                  ]}
                >
                  <Text style={msg.from === 'user' ? styles.bubbleUserText : styles.bubbleBotText}>
                    {msg.text}
                  </Text>
                </View>
              </View>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <View style={[styles.bubbleWrapper, styles.bubbleWrapperBot]}>
                <View style={styles.botAvatarSmall}>
                  <Text style={styles.botAvatarSmallText}>🌿</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.typingText}>Thinking…</Text>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Input Row */}
          <View style={styles.chatInputRow}>
            <TextInput
              style={styles.chatInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask about your aloe vera…"
              placeholderTextColor="#9E9E9E"
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
              editable={!isTyping}
              multiline
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendBtn, (isTyping || !inputText.trim()) && styles.sendBtnDisabled]}
              disabled={isTyping || !inputText.trim()}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendBtnText}>➤</Text>
              )}
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
  aiBadge: {
    marginTop: 4,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  aiBadgeText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
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
  // ── Chatbot modal ──────────────────────────────────────────────
  chatContainer: {
    flex: 1,
    backgroundColor: '#F0F4F0',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 18,
    backgroundColor: '#1B5E20',
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  aiAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#2E7D32',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: {
    fontSize: 22,
  },
  chatTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 5,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#69F0AE',
  },
  onlineText: {
    fontSize: 11,
    color: '#A5D6A7',
    fontWeight: '500',
  },
  chatClose: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
  },
  chatCloseText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '700',
  },
  // Quick suggestions
  suggestionsBar: {
    maxHeight: 46,
    backgroundColor: '#1B5E20',
    borderBottomWidth: 1,
    borderBottomColor: '#2E7D32',
  },
  suggestionsContent: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    gap: 8,
    flexDirection: 'row',
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  suggestionChipText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  // Messages
  chatMessages: {
    flex: 1,
    backgroundColor: '#F0F4F0',
  },
  bubbleWrapper: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
    gap: 8,
  },
  bubbleWrapperUser: {
    justifyContent: 'flex-end',
  },
  bubbleWrapperBot: {
    justifyContent: 'flex-start',
  },
  botAvatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#C8E6C9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  botAvatarSmallText: {
    fontSize: 16,
  },
  bubble: {
    maxWidth: '76%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: '#2E7D32',
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: '#FFFFFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  bubbleError: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FFCC02',
  },
  bubbleUserText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  bubbleBotText: {
    color: '#1B5E20',
    fontSize: 15,
    lineHeight: 22,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  typingText: {
    color: '#78909C',
    fontSize: 13,
    fontStyle: 'italic',
  },
  // Input
  chatInputRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#fff',
    gap: 10,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 10,
    fontSize: 15,
    color: '#212121',
    backgroundColor: '#F1F8E9',
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 24,
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#A5D6A7',
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 18,
  },
});
