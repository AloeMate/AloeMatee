import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, Image,
  ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';

// ── Helpers ────────────────────────────────────────────────────────────────────
function toPercent(val: string | string[] | undefined): string {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? '—' : `${(n * 100).toFixed(1)}%`;
}
function safeStr(val: string | string[] | undefined): string {
  return val ? String(val) : '';
}


// ── Class display config ───────────────────────────────────────────────────────
const CLASS_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  mature:       { label: 'Mature',       emoji: '🌾', color: '#2E7D32', bg: '#E8F5E9' },
  intermediate: { label: 'Intermediate', emoji: '🌿', color: '#558B2F', bg: '#F1F8E9' },
  immature:     { label: 'Immature',     emoji: '🌱', color: '#F9A825', bg: '#FFFDE7' },
  non_aloe:     { label: 'Not Aloe',     emoji: '🚫', color: '#C62828', bg: '#FFEBEE' },
};
const FALLBACK_CONFIG = { label: 'Unknown', emoji: '❓', color: '#757575', bg: '#F5F5F5' };

function getConfig(cls: string) {
  return CLASS_CONFIG[cls?.toLowerCase().trim()] ?? FALLBACK_CONFIG;
}

// ── Subcomponents ──────────────────────────────────────────────────────────────
function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.tableRow, !last && s.tableRowBorder]}>
      <Text style={s.tableLabel}>{label}</Text>
      <Text style={s.tableValue}>{value}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.card}>
      <Text style={s.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function ResultScreen() {
  // FIX: removed duplicate harvestSuggestion key from the type
  const p = useLocalSearchParams<{
    imageUri: string;
    isAloeVera: string;
    cnnClass: string;
    cnnConfidence: string;
    geoArea: string;
    geoClass: string;
    geoConfidence: string;
    classesMatch: string;
    harvestRequired: string;
    harvestMessage: string;
  }>();

  const router = useRouter();

  const isAloe         = p.isAloeVera === 'true';
  const classesMatch    = p.classesMatch === 'true';
  const harvestRequired = p.harvestRequired === 'true';
  const harvestMessage  = safeStr(p.harvestMessage);

  const cnnConf     = parseFloat(safeStr(p.cnnConfidence) || '0');
  const geoConf     = parseFloat(safeStr(p.geoConfidence) || '0');
  const cnnCfg      = getConfig(safeStr(p.cnnClass));
  const geoCfg      = getConfig(safeStr(p.geoClass));

  const isMatureMatch          = classesMatch && harvestRequired;
  const isImmatureOrInterMatch = classesMatch && !harvestRequired && isAloe && !!safeStr(p.geoClass);

  const cnnClassLower = safeStr(p.cnnClass).toLowerCase().trim();
  const geoClassLower = safeStr(p.geoClass).toLowerCase().trim();
  const isSpecificMismatch = 
    (cnnClassLower === 'intermediate' && geoClassLower === 'immature') ||
    (cnnClassLower === 'immature' && geoClassLower === 'intermediate');

  const lowCnnConf = cnnConf > 0 && cnnConf <= 0.65;
  const lowGeoConf = geoConf > 0 && geoConf <= 0.65;

  // ── NON-ALOE result ──────────────────────────────────────────────────────────
  if (!isAloe) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.content}>
          <View style={s.header}>
            <Text style={s.headerTitle}>Scan Result</Text>
          </View>

          <View style={[s.resultBanner, { backgroundColor: '#FFEBEE', borderColor: '#EF9A9A' }]}>
            <Text style={s.bannerEmoji}>🚫</Text>
            <View style={[s.bannerPill, { backgroundColor: '#C62828' }]}>
              <Text style={s.bannerPillText}>NOT ALOE VERA</Text>
            </View>
            <Text style={[s.bannerHeadline, { color: '#C62828' }]}>Not an Aloe Vera Plant</Text>
            <Text style={s.bannerDetail}>
              The CNN model did not detect an Aloe Vera plant in this image.
              Please re-scan a valid aloe vera plant with clear, close-up lighting.
            </Text>
          </View>

          <SectionCard title="🤖 CNN Model Result">
            <View style={[s.classBadge, { backgroundColor: cnnCfg.bg }]}>
              <Text style={[s.classBadgeText, { color: cnnCfg.color }]}>
                {cnnCfg.emoji}  {cnnCfg.label}
              </Text>
            </View>
            <Row label="Confidence" value={toPercent(p.cnnConfidence)} last />
          </SectionCard>

          <View style={s.infoBox}>
            <Text style={s.infoBoxText}>
              ⚠️  Geometric analysis was skipped because the plant was not identified as Aloe Vera.
            </Text>
          </View>

          <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/maturity/camera')}>
            <Text style={s.primaryBtnText}>Scan Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryBtn} onPress={() => router.replace('/')}>
            <Text style={s.secondaryBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── ALOE result ──────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.header}>
          <Text style={s.headerTitle}>Scan Result</Text>
        </View>

        {!!p.imageUri && (
          <Image source={{ uri: safeStr(p.imageUri) }} style={s.image} resizeMode="cover" />
        )}

        {/* ── Harvest suggestion (Mature match) ───────────────────────────── */}
        {isMatureMatch && (
          <View style={[s.harvestCard, { borderColor: cnnCfg.color }]}>
            <View style={s.harvestHeader}>
              <Text style={s.harvestIcon}>🌾</Text>
              <Text style={[s.harvestTitle, { color: cnnCfg.color }]}>Ready for Harvest!</Text>
            </View>
            <Text style={s.harvestBody}>
              {harvestMessage || 'Ready to harvest! Best time: Morning or Evening'}
            </Text>
            <View style={[s.harvestAgreeBadge, { backgroundColor: cnnCfg.bg }]}>
              <Text style={[s.harvestAgreeText, { color: cnnCfg.color }]}>
                ✓ CNN & Geo both agree: {cnnCfg.label}
              </Text>
            </View>
          </View>
        )}

        {/* ── Navigate to Cultivation Date Screen (Immature/Intermediate match) ── */}
        {isImmatureOrInterMatch && (
          <View style={[s.harvestCard, { borderColor: '#1976D2' }]}>
            <View style={s.harvestHeader}>
              <Text style={s.harvestIcon}>🌱</Text>
              <Text style={[s.harvestTitle, { color: '#1976D2' }]}>Not Yet Ready</Text>
            </View>
            <Text style={s.mismatchBody}>
              Both CNN and Geometry agree: this plant is{' '}
              <Text style={{ fontWeight: '700' }}>{cnnCfg.label}</Text>.
              Enter the cultivation date to calculate the estimated harvest date.
            </Text>
            <View style={[s.harvestAgreeBadge, { backgroundColor: '#E3F2FD', marginTop: 10 }]}>
              <Text style={[s.harvestAgreeText, { color: '#1565C0' }]}>
                ✓ Both models agree: {cnnCfg.label}
              </Text>
            </View>
            <TouchableOpacity
              style={[s.primaryBtn, { marginHorizontal: 0, marginTop: 14 }]}
              onPress={() => router.push({
                pathname: '/maturity/cultivation',
                params: {
                  cnnClass:      safeStr(p.cnnClass),
                  geoClass:      safeStr(p.geoClass),
                  cnnConfidence: safeStr(p.cnnConfidence),
                  geoConfidence: safeStr(p.geoConfidence),
                },
              })}
            >
              <Text style={s.primaryBtnText}>📅  Calculate Harvest Date →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Mismatch notice ─────────────────────────────────────────────── */}
        {!classesMatch && (
          <View style={s.mismatchCard}>
            <Text style={s.mismatchIcon}>⚡</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.mismatchTitle}>Models Disagree</Text>
              <Text style={s.mismatchBody}>
                CNN and Geometric analysis returned different classes.
                {isSpecificMismatch 
                  ? ' Please enter your cultivation date to calculate harvest time. Geometric analysis will be prioritized.' 
                  : ' Review both results below for more context.'}
              </Text>
              {isSpecificMismatch && (
                <TouchableOpacity
                  style={[s.primaryBtn, { marginHorizontal: 0, marginTop: 12, padding: 12, backgroundColor: '#E65100' }]}
                  onPress={() => router.push({
                    pathname: '/maturity/cultivation',
                    params: {
                      // Pass geoClass as cnnClass to prioritize Geo algorithm
                      cnnClass:      safeStr(p.geoClass), 
                      geoClass:      safeStr(p.geoClass),
                      cnnConfidence: safeStr(p.cnnConfidence),
                      geoConfidence: safeStr(p.geoConfidence),
                    },
                  })}
                >
                  <Text style={[s.primaryBtnText, { fontSize: 14 }]}>📅  Verify Cultivation Date →</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ── CNN & Geo side-by-side ──────────────────────────────────────── */}
        <View style={s.row2}>
          <View style={[s.miniCard, { borderColor: cnnCfg.color + '55' }]}>
            <Text style={s.miniLabel}>CNN MODEL</Text>
            <Text style={s.miniEmoji}>{cnnCfg.emoji}</Text>
            <View style={[s.miniPill, { backgroundColor: cnnCfg.bg, borderColor: cnnCfg.color }]}>
              <Text style={[s.miniPillText, { color: cnnCfg.color }]}>{cnnCfg.label}</Text>
            </View>
            <Text style={[s.miniConf, lowCnnConf && s.lowConfText]}>
              {toPercent(p.cnnConfidence)}{lowCnnConf ? ' ⚠️' : ''}
            </Text>
          </View>

          <View style={[s.miniCard, { borderColor: geoCfg.color + '55' }]}>
            <Text style={s.miniLabel}>GEOMETRY</Text>
            <Text style={s.miniEmoji}>{geoCfg.emoji}</Text>
            <View style={[s.miniPill, { backgroundColor: geoCfg.bg, borderColor: geoCfg.color }]}>
              <Text style={[s.miniPillText, { color: geoCfg.color }]}>{geoCfg.label}</Text>
            </View>
            <Text style={[s.miniConf, lowGeoConf && s.lowConfText]}>
              {toPercent(p.geoConfidence)}{lowGeoConf ? ' ⚠️' : ''}
            </Text>
          </View>
        </View>

        {/* Low confidence warnings */}
        {(lowCnnConf || lowGeoConf) && (
          <View style={s.warnCard}>
            <Text style={s.warnIcon}>⚠️</Text>
            <Text style={s.warnText}>
              {lowCnnConf && lowGeoConf
                ? 'Both CNN and Geo confidence are below 65%. Re-scan with better lighting.'
                : lowCnnConf
                ? `CNN confidence is low (${(cnnConf * 100).toFixed(0)}%). Capture the leaf closer in brighter light.`
                : `Geo confidence is low (${(geoConf * 100).toFixed(0)}%). Adjust the circle to fit the whole plant.`}
            </Text>
          </View>
        )}

        {/* Geometric Analysis */}
        {!!p.geoArea && (
          <SectionCard title="📐 Geometric Analysis">
            <Row label="Detected Area" value={`${Number(safeStr(p.geoArea)).toLocaleString()} px²`} />
            <Row label="Class"         value={geoCfg.label} />
            <Row label="Confidence"    value={toPercent(p.geoConfidence)} last />
          </SectionCard>
        )}

        <SectionCard title="🤖 CNN Model Details">
          <Row label="Class"      value={cnnCfg.label} />
          <Row label="Confidence" value={toPercent(p.cnnConfidence)} last />
        </SectionCard>

        <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/maturity/camera')}>
          <Text style={s.primaryBtnText}>Scan Another Plant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.replace('/')}>
          <Text style={s.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#F8F9FA' },
  content: { paddingBottom: 48 },

  header: {
    backgroundColor: '#2E7D32',
    paddingTop: 16, paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },

  image: { width: '100%', height: 200, marginBottom: 0 },

  harvestCard: {
    margin: 16, marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16, borderWidth: 2,
    padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 6, elevation: 3,
  },
  harvestHeader:    { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  harvestIcon:      { fontSize: 22, marginRight: 8 },
  harvestTitle:     { fontSize: 17, fontWeight: '700' },
  harvestBody:      { color: '#333', fontSize: 14, lineHeight: 21, marginBottom: 12 },
  harvestAgreeBadge:{ borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  harvestAgreeText: { fontSize: 13, fontWeight: '600' },

  mismatchCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    margin: 16, marginBottom: 8,
    backgroundColor: '#FFF8E1', borderWidth: 1, borderColor: '#FFD54F',
    borderRadius: 12, padding: 14,
  },
  mismatchIcon:  { fontSize: 20 },
  mismatchTitle: { color: '#E65100', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  mismatchBody:  { color: '#5D4037', fontSize: 13, lineHeight: 19 },

  resultBanner: {
    margin: 16, borderWidth: 2, borderRadius: 16,
    padding: 22, alignItems: 'center', gap: 10,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  bannerEmoji:     { fontSize: 56 },
  bannerPill:      { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 5 },
  bannerPillText:  { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  bannerHeadline:  { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  bannerDetail:    { color: '#555', fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  row2:     { flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 10 },
  miniCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 14, alignItems: 'center', borderWidth: 1.5,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  miniLabel:    { color: '#888', fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 6 },
  miniEmoji:    { fontSize: 26, marginBottom: 6 },
  miniPill:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 6 },
  miniPillText: { fontSize: 13, fontWeight: '700' },
  miniConf:     { color: '#777', fontSize: 12 },
  lowConfText:  { color: '#E65100' },

  warnCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#FFB74D',
    borderRadius: 12, padding: 12,
  },
  warnIcon: { fontSize: 18 },
  warnText: { flex: 1, color: '#5D4037', fontSize: 13, lineHeight: 19 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    marginHorizontal: 16, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8EFDF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  cardTitle: { color: '#2E7D32', fontWeight: '700', fontSize: 15, marginBottom: 10 },

  classBadge:     { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 10, alignSelf: 'flex-start' },
  classBadgeText: { fontSize: 16, fontWeight: '700' },

  infoBox: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#E3F2FD', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#90CAF9',
  },
  infoBoxText: { color: '#1565C0', fontSize: 13, lineHeight: 19 },

  tableRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  tableLabel:     { color: '#888', fontSize: 13 },
  tableValue:     { color: '#222', fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: '#2E7D32', padding: 16, borderRadius: 14,
    alignItems: 'center', marginHorizontal: 16, marginTop: 10, marginBottom: 8,
    shadowColor: '#2E7D32', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  primaryBtnText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn:    { padding: 14, borderRadius: 14, alignItems: 'center', marginHorizontal: 16 },
  secondaryBtnText:{ color: '#2E7D32', fontSize: 14, fontWeight: '600' },

  dateInput: {
    borderWidth: 1, borderColor: '#90CAF9', borderRadius: 8, padding: 12, marginTop: 12,
    fontSize: 16, backgroundColor: '#f9f9f9', color: '#222',
  },
});