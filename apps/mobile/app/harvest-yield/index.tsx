import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { predictHarvestYield, HarvestYieldRequest, WeatherData } from '../../services/harvestYield';

// ─── Constants ───────────────────────────────────────────────────────────────
const REGIONS = ['Kurunegala', 'Anuradhapura', 'Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna', 'Puttalam'];
const SOILS = ['Sandy', 'Loamy', 'Clay', 'Sandy Loam', 'Clay Loam'];
const IRRIGATION = ['Rainfed', 'Drip', 'Sprinkler', 'Flood'];
const FERTILIZER = ['None', 'Organic', 'NPK', 'Compost+NPK'];

// ─── Sub-components ───────────────────────────────────────────────────────────
interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onSelect: (v: string) => void;
}

function SelectField({ label, value, options, onSelect }: SelectFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.chip, value === opt && styles.chipActive]}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

interface NumericFieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  hint?: string;
}

function NumericField({ label, value, onChangeText, hint }: NumericFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}{hint ? ` (${hint})` : ''}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#90A4AE"
      />
    </View>
  );
}

// ─── Result Card ─────────────────────────────────────────────────────────────
interface ResultCardProps {
  kg: number;
  weather: WeatherData | null;
}

function ResultCard({ kg, weather }: ResultCardProps) {
  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultIcon}>🌾</Text>
        <Text style={styles.resultTitle}>Predicted Harvest</Text>
      </View>
      <Text style={styles.resultKg}>{kg.toFixed(1)} kg</Text>

      {weather && (
        <View style={styles.weatherRow}>
          <WeatherChip icon="🌡️" label="Temp" value={`${weather.temperatureC}°C`} />
          <WeatherChip icon="💧" label="Humidity" value={`${weather.humidityPct}%`} />
          <WeatherChip icon="🌧️" label="Rain" value={`${weather.rainfallMm} mm`} />
        </View>
      )}
      {weather && (
        <Text style={styles.weatherSource}>
          Weather source: <Text style={{ fontWeight: '700' }}>{weather.source}</Text>
        </Text>
      )}
    </View>
  );
}

function WeatherChip({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.weatherChip}>
      <Text style={styles.weatherIcon}>{icon}</Text>
      <Text style={styles.weatherLabel}>{label}</Text>
      <Text style={styles.weatherValue}>{value}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HarvestYieldScreen() {
  const [region, setRegion] = useState('Kurunegala');
  const [soilType, setSoilType] = useState('Loamy');
  const [irrigationType, setIrrigationType] = useState('Drip');
  const [irrigationPerWeek, setIrrigationPerWeek] = useState('3');
  const [fertilizerType, setFertilizerType] = useState('Organic');
  const [fertilizerKgPerMonth, setFertilizerKgPerMonth] = useState('25');
  const [diseaseSeverity, setDiseaseSeverity] = useState('1');
  const [plantCount, setPlantCount] = useState('900');
  const [avgPlantAgeMonths, setAvgPlantAgeMonths] = useState('18');
  const [farmAreaHa, setFarmAreaHa] = useState('1.5');

  const [loading, setLoading] = useState(false);
  const [resultKg, setResultKg] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const isValid = useMemo(() => {
    const n = (x: string) => Number(x);
    return (
      region.length > 0 &&
      n(plantCount) > 0 &&
      n(avgPlantAgeMonths) >= 6 &&
      n(irrigationPerWeek) >= 0 &&
      n(irrigationPerWeek) <= 7 &&
      n(diseaseSeverity) >= 0 &&
      n(diseaseSeverity) <= 5
    );
  }, [region, plantCount, avgPlantAgeMonths, irrigationPerWeek, diseaseSeverity]);

  async function onPredict() {
    if (!isValid) {
      Alert.alert('Invalid Input', 'Please check your values:\n• Plant age ≥ 6 months\n• Irrigation 0–7×/week\n• Disease severity 0–5');
      return;
    }

    try {
      setLoading(true);
      setResultKg(null);
      setWeather(null);

      const payload: HarvestYieldRequest = {
        region,
        soilType,
        irrigationType,
        irrigationPerWeek: Number(irrigationPerWeek),
        fertilizerType,
        fertilizerKgPerMonth: Number(fertilizerKgPerMonth),
        diseaseSeverity: Number(diseaseSeverity),
        plantCount: Number(plantCount),
        avgPlantAgeMonths: Number(avgPlantAgeMonths),
        farmAreaHa: farmAreaHa ? Number(farmAreaHa) : undefined,
      };

      const res = await predictHarvestYield(payload);
      setResultKg(res.predictedHarvestKg);
      setWeather(res.usedWeather ?? null);
    } catch (e: any) {
      Alert.alert('Prediction Failed', e.message || 'Could not reach the server. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* Hero Banner */}
      <View style={styles.heroBanner}>
        <Text style={styles.heroIcon}>🌿</Text>
        <View>
          <Text style={styles.heroTitle}>Harvest Yield Predictor</Text>
          <Text style={styles.heroSubtitle}>AI + Live Weather · Aloe Vera kg estimate</Text>
        </View>
      </View>

      {/* Section: Farm Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📍 Farm Location</Text>
        <SelectField label="District / Region" value={region} options={REGIONS} onSelect={setRegion} />
      </View>

      {/* Section: Soil & Irrigation */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🌱 Soil & Irrigation</Text>
        <SelectField label="Soil Type" value={soilType} options={SOILS} onSelect={setSoilType} />
        <SelectField label="Irrigation Type" value={irrigationType} options={IRRIGATION} onSelect={setIrrigationType} />
        <NumericField
          label="Irrigation frequency"
          value={irrigationPerWeek}
          onChangeText={setIrrigationPerWeek}
          hint="times/week, 0–7"
        />
      </View>

      {/* Section: Fertilizer & Health */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧪 Fertilizer & Plant Health</Text>
        <SelectField label="Fertilizer Type" value={fertilizerType} options={FERTILIZER} onSelect={setFertilizerType} />
        <NumericField
          label="Fertilizer amount"
          value={fertilizerKgPerMonth}
          onChangeText={setFertilizerKgPerMonth}
          hint="kg/month"
        />
        <NumericField
          label="Disease severity"
          value={diseaseSeverity}
          onChangeText={setDiseaseSeverity}
          hint="0 = healthy, 5 = severe"
        />
      </View>

      {/* Section: Farm Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🏡 Farm Details</Text>
        <NumericField label="Number of plants" value={plantCount} onChangeText={setPlantCount} />
        <NumericField
          label="Average plant age"
          value={avgPlantAgeMonths}
          onChangeText={setAvgPlantAgeMonths}
          hint="months, min 6"
        />
        <NumericField
          label="Farm area"
          value={farmAreaHa}
          onChangeText={setFarmAreaHa}
          hint="hectares, optional"
        />
      </View>

      {/* Predict Button */}
      <TouchableOpacity
        style={[styles.predictBtn, (!isValid || loading) && styles.predictBtnDisabled]}
        onPress={onPredict}
        disabled={!isValid || loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.predictBtnText}>🌾 Predict Harvest</Text>
        )}
      </TouchableOpacity>

      {/* Result */}
      {resultKg !== null && <ResultCard kg={resultKg} weather={weather} />}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const GREEN = '#1B5E20';
const GREEN_LIGHT = '#4CAF50';
const GREEN_BG = '#E8F5E9';

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#F4F6F8' },
  container: { padding: 16 },

  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  heroIcon: { fontSize: 40 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  heroSubtitle: { fontSize: 12, color: '#A5D6A7', marginTop: 2 },

  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: GREEN,
    marginBottom: 12,
  },

  fieldGroup: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#37474F', marginBottom: 8 },

  chipScroll: { flexGrow: 0 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    marginRight: 8,
    backgroundColor: '#F5F5F5',
  },
  chipActive: { backgroundColor: GREEN, borderColor: GREEN },
  chipText: { fontSize: 13, fontWeight: '600', color: '#546E7A' },
  chipTextActive: { color: '#fff' },

  input: {
    borderWidth: 1.5,
    borderColor: '#CFD8DC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: '#263238',
    backgroundColor: '#FAFAFA',
  },

  predictBtn: {
    backgroundColor: GREEN_LIGHT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: GREEN_LIGHT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  predictBtnDisabled: { backgroundColor: '#B0BEC5', shadowOpacity: 0 },
  predictBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  resultCard: {
    backgroundColor: GREEN,
    borderRadius: 20,
    padding: 22,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  resultIcon: { fontSize: 28 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#A5D6A7' },
  resultKg: { fontSize: 56, fontWeight: '900', color: '#fff', marginBottom: 16 },

  weatherRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  weatherChip: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  weatherIcon: { fontSize: 18 },
  weatherLabel: { fontSize: 10, color: '#C8E6C9', marginTop: 2 },
  weatherValue: { fontSize: 13, fontWeight: '700', color: '#fff' },
  weatherSource: { fontSize: 11, color: '#A5D6A7' },
});
