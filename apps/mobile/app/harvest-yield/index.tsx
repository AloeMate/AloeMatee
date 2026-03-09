import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { FormInput } from '../../components/FormInput';
import { FormSelect } from '../../components/FormSelect';
import { predictHarvestYield } from '../../services/harvestYield';
import {
  detectFarmerLocation,
  isSupportedDistrict,
  findNearestSupportedDistrict,
  type LocationResult,
  type LocationError,
} from '../../services/location';

const REGIONS    = ['Kurunegala', 'Anuradhapura', 'Colombo', 'Kandy', 'Galle', 'Matara', 'Jaffna', 'Puttalam'];
const SOILS      = ['Sandy', 'Loamy', 'Clay', 'Sandy Loam', 'Clay Loam'];
const IRRIGATION = ['Rainfed', 'Drip', 'Sprinkler', 'Flood'];
const FERTILIZER = ['None', 'Organic', 'NPK', 'Compost+NPK'];

export default function HarvestYieldScreen() {
  const [loading, setLoading]                   = useState(false);
  const [locationLoading, setLocationLoading]   = useState(false);
  const [locationDetected, setLocationDetected] = useState(false);
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null);

  const [region, setRegion]                                 = useState('Kurunegala');
  const [soilType, setSoilType]                             = useState('Loamy');
  const [irrigationType, setIrrigationType]                 = useState('Drip');
  const [irrigationPerWeek, setIrrigationPerWeek]           = useState('3');
  const [fertilizerType, setFertilizerType]                 = useState('Organic');
  const [fertilizerKgPerMonth, setFertilizerKgPerMonth]     = useState('25');
  const [diseaseSeverity, setDiseaseSeverity]               = useState('1');
  const [plantCount, setPlantCount]                         = useState('900');
  const [avgPlantAgeMonths, setAvgPlantAgeMonths]           = useState('18');
  const [farmAreaHa, setFarmAreaHa]                         = useState('1.5');

  const [resultKg, setResultKg]   = useState<number | null>(null);
  const [weather, setWeather]     = useState<any>(null);
  const [weatherSource, setWeatherSource] = useState<'live' | 'mock' | null>(null);

  const isValid = useMemo(() => {
    const n = Number;
    return (
      region.length > 0 &&
      n(plantCount) > 0 &&
      n(avgPlantAgeMonths) >= 6 &&
      n(irrigationPerWeek) >= 0 && n(irrigationPerWeek) <= 7 &&
      n(diseaseSeverity) >= 0 && n(diseaseSeverity) <= 5
    );
  }, [region, plantCount, avgPlantAgeMonths, irrigationPerWeek, diseaseSeverity]);

  async function onDetectLocation() {
    setLocationLoading(true);
    setLocationDetected(false);
    setLocationAccuracy(null);
    try {
      const result = await detectFarmerLocation();
      if ('code' in result) {
        Alert.alert('Location Detection Failed', (result as LocationError).message);
        return;
      }
      const loc = result as LocationResult;
      let district = loc.district;
      if (!isSupportedDistrict(district)) {
        const nearest = findNearestSupportedDistrict(district);
        Alert.alert(
          'District Mapped',
          `${district} was mapped to the nearest supported district: ${nearest}`,
        );
        district = nearest;
      }
      setRegion(district);
      setLocationDetected(true);
      setLocationAccuracy(loc.accuracy ?? null);
      Alert.alert(
        'Location Detected',
        `District set to: ${district}${loc.accuracy ? `\nGPS accuracy: ${Math.round(loc.accuracy)} m` : ''}`,
      );
    } catch {
      Alert.alert('Error', 'Failed to detect location. Please select your district manually.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function onPredict() {
    if (!isValid) {
      Alert.alert('Invalid input', 'Please check your values and try again.');
      return;
    }
    try {
      setLoading(true);
      setResultKg(null);
      setWeather(null);
      setWeatherSource(null);

      const res = await predictHarvestYield({
        region,
        soilType,
        irrigationType,
        irrigationPerWeek:    Number(irrigationPerWeek),
        fertilizerType,
        fertilizerKgPerMonth: Number(fertilizerKgPerMonth),
        diseaseSeverity:      Number(diseaseSeverity),
        plantCount:           Number(plantCount),
        avgPlantAgeMonths:    Number(avgPlantAgeMonths),
        farmAreaHa:           farmAreaHa ? Number(farmAreaHa) : undefined,
      });

      setResultKg(res.predictedHarvestKg);
      setWeather(res.usedWeather);
      setWeatherSource(res.weatherSource);
    } catch (e: any) {
      const msg =
        e?.response?.data?.detail ??
        e?.response?.data?.message ??
        (e?.request ? 'No response from server. Is the backend running?' : e?.message ?? 'Unknown error');
      Alert.alert('Prediction Failed', msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>🌿 Harvest Yield Prediction</Text>
      <Text style={styles.subtitle}>Estimate your Aloe Vera harvest in kilograms</Text>

      {/* GPS Location */}
      <View style={styles.locationBox}>
        <Text style={styles.sectionTitle}>📍 Location Detection</Text>
        <Text style={styles.hint}>
          Auto-detect your district for accurate live weather data
        </Text>
        <Pressable
          onPress={onDetectLocation}
          disabled={locationLoading}
          style={[styles.locationBtn, locationLoading && styles.locationBtnDisabled]}
        >
          {locationLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.locationBtnText}>Detecting…</Text>
            </>
          ) : (
            <Text style={styles.locationBtnText}>🌍  Detect My Location</Text>
          )}
        </Pressable>
        {locationDetected && (
          <View style={styles.locationSuccess}>
            <Text style={styles.locationSuccessText}>✓ Detected: {region}</Text>
            {locationAccuracy !== null && (
              <Text style={styles.locationAccuracy}>Accuracy: {Math.round(locationAccuracy)} m</Text>
            )}
          </View>
        )}
      </View>

      {/* Selectors */}
      <FormSelect
        label={`Region ${locationDetected ? '(Auto-detected)' : '(Manual)'}`}
        value={region}
        options={REGIONS}
        onChange={setRegion}
      />
      <FormSelect label="Soil Type"        value={soilType}        options={SOILS}       onChange={setSoilType} />
      <FormSelect label="Irrigation Type"  value={irrigationType}  options={IRRIGATION}  onChange={setIrrigationType} />
      <FormSelect label="Fertilizer Type"  value={fertilizerType}  options={FERTILIZER}  onChange={setFertilizerType} />

      {/* Inputs */}
      <FormInput label="Plant Count"                   value={plantCount}           onChangeText={setPlantCount}           keyboardType="numeric" />
      <FormInput label="Average Plant Age (months)"    value={avgPlantAgeMonths}    onChangeText={setAvgPlantAgeMonths}    keyboardType="numeric" />
      <FormInput label="Farm Area (ha)  — optional"    value={farmAreaHa}           onChangeText={setFarmAreaHa}           keyboardType="numeric" placeholder="1.0" />
      <FormInput label="Irrigations per week (0–7)"    value={irrigationPerWeek}    onChangeText={setIrrigationPerWeek}    keyboardType="numeric" />
      <FormInput label="Fertilizer kg per month"       value={fertilizerKgPerMonth} onChangeText={setFertilizerKgPerMonth} keyboardType="numeric" />
      <FormInput label="Disease severity (0–5)"        value={diseaseSeverity}      onChangeText={setDiseaseSeverity}      keyboardType="numeric" />

      {/* Submit */}
      <Pressable
        onPress={onPredict}
        disabled={loading || !isValid}
        style={[styles.predictBtn, (loading || !isValid) && styles.predictBtnDisabled]}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.predictBtnText}>Predict Harvest</Text>
        )}
      </Pressable>

      {/* Result */}
      {resultKg !== null && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Predicted Yield</Text>
          <Text style={styles.resultKg}>{resultKg.toFixed(1)} kg</Text>

          {weather && (
            <View style={styles.weatherBox}>
              <Text style={styles.weatherTitle}>
                Weather Used  {weatherSource === 'mock' && <Text style={styles.mockBadge}>(estimated)</Text>}
              </Text>
              <Text style={styles.weatherRow}>🌡  {weather.temperatureC} °C</Text>
              <Text style={styles.weatherRow}>💧 {weather.humidityPct} %</Text>
              <Text style={styles.weatherRow}>🌧  {weather.rainfallMm} mm</Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:            { padding: 16, paddingBottom: 48 },
  title:                { fontSize: 22, fontWeight: '800', color: '#2E7D32', marginBottom: 4 },
  subtitle:             { fontSize: 14, color: '#555', marginBottom: 20 },
  sectionTitle:         { fontSize: 16, fontWeight: '700', color: '#495057', marginBottom: 4 },
  hint:                 { fontSize: 13, color: '#6c757d', marginBottom: 10 },
  locationBox:          { marginBottom: 20, padding: 16, backgroundColor: '#f8f9fa', borderRadius: 12, borderWidth: 1, borderColor: '#e9ecef' },
  locationBtn:          { backgroundColor: '#4CAF50', paddingVertical: 12, borderRadius: 8, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  locationBtnDisabled:  { backgroundColor: '#aaa' },
  locationBtnText:      { color: '#fff', fontWeight: '600', fontSize: 15 },
  locationSuccess:      { marginTop: 10, padding: 10, backgroundColor: '#d4edda', borderRadius: 8, borderWidth: 1, borderColor: '#c3e6cb' },
  locationSuccessText:  { color: '#155724', fontWeight: '600' },
  locationAccuracy:     { color: '#155724', fontSize: 12, marginTop: 2 },
  predictBtn:           { marginTop: 8, backgroundColor: '#2E7D32', paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  predictBtnDisabled:   { backgroundColor: '#aaa' },
  predictBtnText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  resultCard:           { marginTop: 20, padding: 16, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 14, backgroundColor: '#F1F8E9' },
  resultTitle:          { fontSize: 16, fontWeight: '800', color: '#2E7D32' },
  resultKg:             { fontSize: 36, fontWeight: '900', color: '#1B5E20', marginTop: 4 },
  weatherBox:           { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#C8E6C9' },
  weatherTitle:         { fontWeight: '700', color: '#333', marginBottom: 4 },
  mockBadge:            { fontWeight: '400', color: '#888', fontSize: 12 },
  weatherRow:           { color: '#444', marginTop: 2 },
});
