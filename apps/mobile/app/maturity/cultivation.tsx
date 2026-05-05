import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
// ── Harvest Logic & Plant Details ───────────────────────────────────────────
const STAGE_DETAILS: Record<string, any> = {
  immature: {
    title: 'No Mature (Young stage)',
    ageRange: '0 – 180 days (0–6 months)',
    leafLength: '8 – 15 cm',
    leafThickness: '< 10 mm',
    leaves: '< 10',
    gel: 'Low',
    status: 'Not ready for harvest',
    transition: '≈ 365 days (1 year) to optimal Mature harvest',
    minDays: 365,
    maxDays: 375, // Exactly a 10 day optimal window
  },
  intermediate: {
    title: 'Intermediate (Semi-mature)',
    ageRange: '180 – 365 days (6–12 months)',
    leafLength: '15 – 30 cm',
    leafThickness: '10 – 15 mm',
    leaves: '10 – 15',
    gel: 'Medium',
    status: 'Not ready for harvest',
    transition: '≈ 180 days (6 months) to optimal Mature harvest',
    minDays: 180,
    maxDays: 190, // Exactly a 10 day optimal window
  },
  mature: {
    title: 'Mature (Full harvest stage)',
    ageRange: '365+ days (12+ months)',
    leafLength: '30 – 60 cm',
    leafThickness: '> 15 mm',
    leaves: '15 – 20',
    gel: 'High (best quality)',
    status: 'Fully ready for commercial harvest',
    transition: 'The harvest should be done within these 10 days or this week',
    minDays: 0,
    maxDays: 10,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function safeStr(v: string | string[] | undefined): string {
  return Array.isArray(v) ? v[0] : v ?? '';
}

function toPercent(v: string | string[] | undefined): string {
  const n = parseFloat(safeStr(v));
  return isNaN(n) ? '—' : `${(n * 100).toFixed(1)}%`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

// ── Screen ───────────────────────────────────────────────────────────────────
export default function CultivationScreen() {
  const p = useLocalSearchParams<{
    cnnClass: string;
    geoClass: string;
    cnnConfidence: string;
    geoConfidence: string;
  }>();
  const router = useRouter();

  const [cultivationDate, setCultivationDate] = useState(new Date());
  const [showPicker, setShowPicker]           = useState(false);
  const [result, setResult] = useState<null | {
    ready: boolean;
    remainingMin: number;
    remainingMax: number;
    harvestDateMin: Date;
    harvestDateMax: Date;
    daysPassed: number;
  }>(null);

  const rawClass = safeStr(p.cnnClass).toLowerCase();
  const details = STAGE_DETAILS[rawClass] || STAGE_DETAILS['immature'];

  const calculate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cult = new Date(cultivationDate);
    cult.setHours(0, 0, 0, 0);

    const daysPassed = Math.floor((today.getTime() - cult.getTime()) / 86_400_000);
    
    const remainingMin = details.minDays - daysPassed;
    const remainingMax = details.maxDays - daysPassed;
    
    const harvestDateMin = addDays(today, Math.max(0, remainingMin));
    const harvestDateMax = addDays(today, Math.max(0, remainingMax));

    setResult({ 
      ready: remainingMin <= 0, 
      remainingMin, 
      remainingMax,
      harvestDateMin, 
      harvestDateMax,
      daysPassed 
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Harvest Calculator</Text>
          <Text style={s.headerSub}>Based on plant traits & cultivation date</Text>
        </View>

        {/* Plant Stage Details */}
        <View style={s.detailsCard}>
          <Text style={s.detailsHeader}>🌿 Current Stage: {details.title}</Text>
          <View style={s.detailRow}><Text style={s.detailLabel}>Age Range:</Text><Text style={s.detailValue}>{details.ageRange}</Text></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Leaf length:</Text><Text style={s.detailValue}>{details.leafLength}</Text></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Leaf thickness:</Text><Text style={s.detailValue}>{details.leafThickness}</Text></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Leaves per plant:</Text><Text style={s.detailValue}>{details.leaves}</Text></View>
          <View style={s.detailRow}><Text style={s.detailLabel}>Gel content:</Text><Text style={s.detailValue}>{details.gel}</Text></View>
          
          <View style={s.statusBadge}>
            <Text style={s.statusBadgeText}>👉 {details.status}</Text>
          </View>
          
          <Text style={s.transitionText}>⏳ Estimated transition: {details.transition}</Text>
        </View>

        {/* Date picker section */}
        <View style={s.card}>
          <Text style={s.sectionTitle}>📅 Calculate Exact Harvest Window</Text>
          <Text style={s.sectionBody}>
            Know when you planted this aloe? Enter the cultivation date to calculate the exact commercial harvest window ({details.minDays} – {details.maxDays} days).
          </Text>

          {/* iOS: inline picker. Android: show on button tap */}
          {(showPicker || Platform.OS === 'ios') && (
            <DateTimePicker
              value={cultivationDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              maximumDate={new Date()}
              onChange={(_, selected) => {
                if (Platform.OS === 'android') setShowPicker(false);
                if (selected) setCultivationDate(selected);
              }}
              style={s.picker}
            />
          )}

          {Platform.OS === 'android' && (
            <TouchableOpacity style={s.dateBtn} onPress={() => setShowPicker(true)}>
              <Text style={s.dateBtnText}>📅  {formatDate(cultivationDate)}</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.calcBtn} onPress={calculate}>
            <Text style={s.calcBtnText}>Calculate Timeline</Text>
          </TouchableOpacity>
        </View>

        {/* Result card */}
        {result !== null && (
          result.ready ? (
            /* ── Ready to harvest ────────────────────────────────────────── */
            <View style={[s.card, { borderColor: '#388E3C', backgroundColor: '#E8F5E9' }]}>
              <Text style={s.resultEmoji}>🌾</Text>
              <Text style={[s.resultTitle, { color: '#2E7D32' }]}>Ready to Harvest!</Text>
              <Text style={[s.resultBody, { color: '#388E3C' }]}>
                This plant has been growing for {result.daysPassed} days, which is well within the mature window.
              </Text>
              <View style={[s.harvestBadge, { backgroundColor: '#2E7D32' }]}>
                <Text style={s.harvestBadgeText}>Fully ready for commercial harvest</Text>
              </View>
            </View>
          ) : (
            /* ── Harvest date estimated ──────────────────────────────────── */
            <View style={[s.card, { borderColor: '#1976D2', backgroundColor: '#E3F2FD' }]}>
              <Text style={s.resultEmoji}>⏳</Text>
              <Text style={[s.resultTitle, { color: '#1565C0' }]}>Estimated Harvest Window</Text>
              <Text style={[s.resultDays, { color: '#1565C0' }]}>
                {Math.max(0, result.remainingMin)} – {result.remainingMax} days to go
              </Text>
              
              <View style={[s.harvestBadge, { backgroundColor: '#1565C0' }]}>
                <Text style={s.harvestBadgeText}>{formatDate(result.harvestDateMin)} – {formatDate(result.harvestDateMax)}</Text>
              </View>
              
              <View style={s.statsBox}>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Cultivated</Text>
                  <Text style={s.statValue}>{formatDate(cultivationDate)}</Text>
                </View>
                <View style={s.statRow}>
                  <Text style={s.statLabel}>Days passed</Text>
                  <Text style={s.statValue}>{result.daysPassed} / {details.minDays} days minimum</Text>
                </View>
              </View>
            </View>
          )
        )}

        {/* Navigation */}
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Back to Results</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F4F6F0' },
  content: { paddingBottom: 48 },

  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 16, paddingBottom: 24, paddingHorizontal: 20,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  headerSub:   { color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 4 },

  detailsCard: {
    margin: 16, marginBottom: 0,
    backgroundColor: '#fff', borderRadius: 16,
    borderWidth: 2, borderColor: '#4CAF50',
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  detailsHeader: { fontSize: 17, fontWeight: '700', color: '#2E7D32', marginBottom: 12 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  detailLabel: { color: '#666', fontSize: 14 },
  detailValue: { color: '#222', fontSize: 14, fontWeight: '600' },
  statusBadge: { backgroundColor: '#E8F5E9', padding: 10, borderRadius: 8, marginTop: 12, alignItems: 'center' },
  statusBadgeText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 14 },
  transitionText: { color: '#E65100', fontSize: 13, marginTop: 12, textAlign: 'center', fontWeight: '600' },

  card: {
    backgroundColor: '#fff', margin: 16, marginBottom: 0,
    borderRadius: 16, borderWidth: 2, borderColor: '#E8EFDF',
    padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2E7D32', marginBottom: 8 },
  sectionBody:  { fontSize: 13, color: '#666', lineHeight: 20, marginBottom: 16 },

  picker:  { marginBottom: 8 },

  dateBtn: {
    backgroundColor: '#E3F2FD', borderWidth: 2, borderColor: '#1976D2',
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 12,
  },
  dateBtnText: { fontSize: 14, color: '#1565C0', fontWeight: '600' },

  calcBtn: {
    backgroundColor: '#2E7D32', borderRadius: 12,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resultEmoji: { fontSize: 44, textAlign: 'center', marginBottom: 8 },
  resultTitle: { fontSize: 19, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  resultDays:  { fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 14 },
  resultBody:  { fontSize: 13, lineHeight: 20, textAlign: 'center', marginBottom: 12 },

  harvestBadge: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 20, alignSelf: 'center', marginBottom: 14,
  },
  harvestBadgeText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  statsBox: {
    backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10,
    padding: 12, gap: 6,
  },
  statRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  statLabel: { fontSize: 13, color: '#888' },
  statValue: { fontSize: 13, color: '#222', fontWeight: '600' },

  backBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#2E7D32', alignItems: 'center',
  },
  backBtnText: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
});
