import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, TouchableOpacity, Image,
  ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';

// ── Harvest timing constants ───────────────────────────────────────────────
// Immature  → needs 12 more months from now
// Intermediate → needs 6 more months from now
const IMMATURE_MONTHS_NEEDED    = 12;
const INTERMEDIATE_MONTHS_NEEDED = 6;

function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
}

interface ActionConfig {
  emoji:       string;
  color:       string;
  label:       string;
  headline:    string;
  getDetail:   (age: number) => string;
  getSubtitle: (age: number) => string | null;
}

// Keys lowercase — matched with cls.toLowerCase().trim()
const ACTION_MAP: Record<string, ActionConfig> = {
  mature: {
    emoji:    '🌾',
    color:    '#4CAF50',
    label:    'Mature',
    headline: 'Ready to Harvest',
    getDetail:   () =>
      'Your aloe vera plant has reached optimal maturity and is ready to harvest.',
    // Best time of day to harvest
    getSubtitle: () => '🌅  Best harvested in the Morning or Evening',
  },
  intermediate: {
    emoji:    '🌿',
    color:    '#8BC34A',
    label:    'Intermediate',
    headline: 'Not Ready Yet',
    getDetail: () =>
      `The plant is still growing. Come back in approximately ${INTERMEDIATE_MONTHS_NEEDED} months.`,
    getSubtitle: () =>
      `📅  Estimated harvest date: ${addMonths(INTERMEDIATE_MONTHS_NEEDED)}`,
  },
  immature: {
    emoji:    '🌱',
    color:    '#FFC107',
    label:    'Immature',
    headline: 'Needs More Time',
    getDetail: () =>
      `The plant is in early development. Come back in approximately ${IMMATURE_MONTHS_NEEDED} months.`,
    getSubtitle: () =>
      `📅  Estimated harvest date: ${addMonths(IMMATURE_MONTHS_NEEDED)}`,
  },
  non_aloe: {
    emoji:    '🚫',
    color:    '#f44336',
    label:    'Non-Aloe Detected',
    headline: 'This is Not an Aloe Vera Plant',
    getDetail:   () =>
      'The system did not detect an Aloe Vera plant. Please re-scan a valid aloe plant.',
    getSubtitle: () => null,
  },
};

const FALLBACK: ActionConfig = {
  emoji: '❓', color: '#9E9E9E', label: 'Unknown',
  headline: 'Unable to Determine',
  getDetail:   () => 'Please re-scan the plant with better lighting and alignment.',
  getSubtitle: () => null,
};

function getAction(cls: string): ActionConfig {
  return ACTION_MAP[cls?.toLowerCase?.().trim() ?? ''] ?? FALLBACK;
}
function toPercent(val: string | string[] | undefined): string {
  const n = parseFloat(String(val ?? ''));
  return isNaN(n) ? '—' : `${(n * 100).toFixed(1)}%`;
}
function safeStr(val: string | string[] | undefined): string {
  return val ? String(val) : '—';
}
function safeInt(val: string | string[] | undefined, fb = 0): number {
  const n = parseInt(String(val ?? ''), 10);
  return isNaN(n) ? fb : n;
}
function friendlyClass(cls: string | string[] | undefined): string {
  const s = safeStr(cls);
  return ACTION_MAP[s.toLowerCase().trim()]?.label ?? s;
}

export default function ResultScreen() {
  const p = useLocalSearchParams<{
    imageUri: string; maturity: string; confidence: string;
    decisionReason: string; geoArea: string; geoClass: string;
    geoConfidence: string; cnnClass: string; cnnConfidence: string;
    plantAge: string; lowConfidence: string;
  }>();

  const router    = useRouter();
  const age       = safeInt(p.plantAge, 3);
  const action    = getAction(safeStr(p.maturity));
  const isLowConf = p.lowConfidence === 'true';
  const cnnConf   = parseFloat(String(p.cnnConfidence ?? '0'));
  const geoConf   = parseFloat(String(p.geoConfidence ?? '0'));
  const confPct   = Math.round(parseFloat(String(p.confidence ?? '0')) * 100);

  const subtitle = action.getSubtitle(age);
  const isMature = safeStr(p.maturity).toLowerCase().trim() === 'mature';

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Main action card ──────────────────────────────────────────── */}
        <View style={[s.actionCard, { borderColor: action.color }]}>
          <Text style={s.actionEmoji}>{action.emoji}</Text>

          <View style={[s.stagePill, { backgroundColor: action.color + '22', borderColor: action.color }]}>
            <Text style={[s.stagePillText, { color: action.color }]}>
              {action.label.toUpperCase()}
            </Text>
          </View>

          <Text style={[s.headline, { color: action.color }]}>{action.headline}</Text>
          <Text style={s.detail}>{action.getDetail(age)}</Text>

          {/* Harvest timing box */}
          {subtitle && (
            <View style={[
              s.harvestBox,
              { borderColor: action.color + '55' },
              isMature && s.harvestBoxMature,
            ]}>
              <Text style={[s.harvestText, { color: action.color }]}>
                {subtitle}
              </Text>
            </View>
          )}

          {/* Confidence bar */}
          <View style={s.confRow}>
            <Text style={s.confLabel}>Confidence</Text>
            <View style={s.confBarBg}>
              <View style={[s.confBarFill, { width: `${confPct}%` as any, backgroundColor: action.color }]} />
            </View>
            <Text style={[s.confValue, { color: action.color }]}>{toPercent(p.confidence)}</Text>
          </View>
        </View>

        {/* ── Low confidence warning ────────────────────────────────────── */}
        {isLowConf && (
          <View style={s.warningCard}>
            <Text style={s.warnIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.warnTitle}>Low Confidence Result</Text>
              <Text style={s.warnBody}>
                {cnnConf <= 0.65 && geoConf <= 0.65
                  ? 'Both CNN and Geo signals are below 65%. Consider re-scanning with better lighting.'
                  : cnnConf <= 0.65
                  ? `CNN confidence is low (${(cnnConf * 100).toFixed(0)}%). Capture the leaf closer in brighter light.`
                  : `Geo confidence is low (${(geoConf * 100).toFixed(0)}%). Adjust the circle to fit the whole plant.`}
              </Text>
            </View>
          </View>
        )}

        {/* Image */}
        {p.imageUri && (
          <Image source={{ uri: safeStr(p.imageUri) }} style={s.image} resizeMode="cover" />
        )}

        {/* Decision reason */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Decision Reason</Text>
          <Text style={s.cardBody}>{safeStr(p.decisionReason)}</Text>
        </View>

        {/* Mini model summary */}
        <View style={s.row2}>
          <View style={[s.miniCard, { flex: 1 }]}>
            <Text style={s.miniTitle}>CNN Model</Text>
            <View style={[s.pill, { borderColor: action.color }]}>
              <Text style={[s.pillText, { color: action.color }]}>{friendlyClass(p.cnnClass)}</Text>
            </View>
            <Text style={[s.miniConf, cnnConf <= 0.65 && s.lowConf]}>
              {toPercent(p.cnnConfidence)}{cnnConf <= 0.65 ? ' ⚠️' : ''}
            </Text>
          </View>
          <View style={[s.miniCard, { flex: 1 }]}>
            <Text style={s.miniTitle}>Geometry</Text>
            <View style={[s.pill, { borderColor: action.color }]}>
              <Text style={[s.pillText, { color: action.color }]}>{friendlyClass(p.geoClass)}</Text>
            </View>
            <Text style={[s.miniConf, geoConf <= 0.65 && s.lowConf]}>
              {toPercent(p.geoConfidence)}{geoConf <= 0.65 ? ' ⚠️' : ''}
            </Text>
          </View>
        </View>

        {/* GEO details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Geometric Analysis</Text>
          <Row label="Detected Area" value={`${Number(safeStr(p.geoArea)).toLocaleString()} px²`} />
          <Row label="Class"         value={friendlyClass(p.geoClass)} />
          <Row label="Confidence"    value={toPercent(p.geoConfidence)} last />
        </View>

        {/* CNN details */}
        <View style={s.card}>
          <Text style={s.cardTitle}>CNN Model Details</Text>
          <Row label="Class"      value={friendlyClass(p.cnnClass)} />
          <Row label="Confidence" value={toPercent(p.cnnConfidence)} last />
        </View>

        {/* Plant info */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Plant Info</Text>
          <Row label="Age" value={`${age} months`} />
          <Row
            label="Time to Harvest"
            value={
              isMature
                ? 'Morning or Evening'
                : safeStr(p.maturity).toLowerCase().trim() === 'intermediate'
                ? `${INTERMEDIATE_MONTHS_NEEDED} months`
                : safeStr(p.maturity).toLowerCase().trim() === 'immature'
                ? `${IMMATURE_MONTHS_NEEDED} months`
                : '—'
            }
            last
          />
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={() => router.replace('/camera')} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Scan Another Plant</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.secondaryBtn} onPress={() => router.replace('/')} activeOpacity={0.85}>
          <Text style={s.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[s.tableRow, !last && { borderBottomWidth: 1, borderBottomColor: '#252525' }]}>
      <Text style={s.tableLabel}>{label}</Text>
      <Text style={s.tableValue}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: '#111' },
  scroll:  { flex: 1 },
  content: { padding: 16, paddingBottom: 48 },

  actionCard:    { alignItems: 'center', borderWidth: 2, borderRadius: 20, paddingVertical: 26, paddingHorizontal: 20, marginBottom: 14, backgroundColor: '#161616', gap: 10 },
  actionEmoji:   { fontSize: 60 },
  stagePill:     { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 4 },
  stagePillText: { fontSize: 12, fontWeight: '700', letterSpacing: 1.5 },
  headline:      { fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 0.5 },
  detail:        { color: '#bbb', fontSize: 14, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },

  harvestBox: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 10, marginTop: 4,
  },
  harvestBoxMature: {
    // Slightly warmer highlight for the "Morning or Evening" tip
    backgroundColor: 'rgba(76,175,80,0.08)',
  },
  harvestText: { fontSize: 14, fontWeight: '600' },

  confRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, width: '100%', paddingHorizontal: 8 },
  confLabel:  { color: '#666', fontSize: 12, width: 72 },
  confBarBg:  { flex: 1, height: 6, backgroundColor: '#2a2a2a', borderRadius: 3, overflow: 'hidden' },
  confBarFill:{ height: '100%', borderRadius: 3 },
  confValue:  { fontSize: 12, fontWeight: '600', width: 44, textAlign: 'right' },

  warningCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#2a1f00', borderWidth: 1, borderColor: '#FF9800', borderRadius: 14, padding: 14, marginBottom: 14 },
  warnIcon:    { fontSize: 20 },
  warnTitle:   { color: '#FF9800', fontWeight: 'bold', fontSize: 13, marginBottom: 4 },
  warnBody:    { color: '#ccc', fontSize: 13, lineHeight: 19 },

  image:     { width: '100%', height: 200, borderRadius: 14, marginBottom: 14 },
  card:      { backgroundColor: '#1b1b1b', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#232323' },
  cardTitle: { color: '#4CAF50', fontWeight: 'bold', fontSize: 14, marginBottom: 10 },
  cardBody:  { color: '#bbb', fontSize: 13, lineHeight: 20 },
  row2:      { flexDirection: 'row', gap: 10, marginBottom: 12 },
  miniCard:  { backgroundColor: '#1b1b1b', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#232323' },
  miniTitle: { color: '#888', fontSize: 12, marginBottom: 8 },
  miniConf:  { color: '#888', fontSize: 12, marginTop: 6 },
  lowConf:   { color: '#FF9800' },
  pill:      { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pillText:  { fontSize: 13, fontWeight: '600' },
  tableRow:  { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  tableLabel:{ color: '#777', fontSize: 13 },
  tableValue:{ color: '#eee', fontSize: 13, fontWeight: '500' },

  primaryBtn:      { backgroundColor: '#4CAF50', padding: 16, borderRadius: 13, alignItems: 'center', marginBottom: 10, marginTop: 6 },
  primaryBtnText:  { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn:    { backgroundColor: '#1e1e1e', padding: 14, borderRadius: 13, alignItems: 'center', borderWidth: 1, borderColor: '#2e2e2e' },
  secondaryBtnText:{ color: '#777', fontSize: 14 },
});