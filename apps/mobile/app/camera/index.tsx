import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import ResizableCircle from '../../components/ResizableCircle';
import { predictMaturity } from '../../services/api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const CNN_GUIDE_FRACTION = 0.70;
const GUIDE_SIZE         = SCREEN_W * CNN_GUIDE_FRACTION;

type CaptureStep = 'CNN' | 'CNN_EDIT' | 'GEO' | 'GEO_EDIT';

// ── Status messages shown during analyze ─────────────────────────────────────
const STATUS_STEPS = [
  { label: 'Connecting to server…',  duration: 4000  },
  { label: 'Uploading images…',      duration: 3000  },
  { label: 'Running CNN model…',     duration: 5000  },
  { label: 'Running Geo algorithm…', duration: 5000  },
  { label: 'Calculating result…',    duration: 99999 },
];

function useStatusCycle(active: boolean) {
  const [idx, setIdx]     = useState(0);
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef         = useRef(active);
  activeRef.current       = active;

  React.useEffect(() => {
    if (!active) { setIdx(0); return; }

    let current = 0;
    const schedule = () => {
      if (!activeRef.current) return;
      if (current >= STATUS_STEPS.length - 1) return;
      timerRef.current = setTimeout(() => {
        current += 1;
        setIdx(current);
        schedule();
      }, STATUS_STEPS[current].duration);
    };
    schedule();

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [active]);

  return STATUS_STEPS[idx].label;
}

export default function CameraScreen() {
  const [facing]                        = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing]   = useState(false);
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [step, setStep]                 = useState<CaptureStep>('CNN');
  const [cnnImageUri, setCnnImageUri]   = useState<string | null>(null);
  const [geoImageUri, setGeoImageUri]   = useState<string | null>(null);
  const [geoPhotoSize, setGeoPhotoSize] = useState<{ w: number; h: number } | null>(null);
  const [showAgeInput, setShowAgeInput] = useState(true);
  const [showGuidelines, setShowGuidelines] = useState(false);
  const [plantAgeMonths, setPlantAgeMonths] = useState('');

  const cameraRef = useRef<CameraView>(null);
  const router    = useRouter();
  const roiRef    = useRef({ x: 0.5, y: 0.5, r: 0.35 });

  const statusLabel = useStatusCycle(isAnalyzing);

  // ── Permission loading ────────────────────────────────────────────────────
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // ── Permission denied ─────────────────────────────────────────────────────
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📷</Text>
          <Text style={styles.cardTitle}>Camera Access Required</Text>
          <Text style={styles.cardDesc}>Grant camera permission to scan your aloe plant.</Text>
          <TouchableOpacity style={styles.greenBtn} onPress={requestPermission}>
            <Text style={styles.greenBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Age input ─────────────────────────────────────────────────────────────
  if (showAgeInput) {
    return (
      <KeyboardAvoidingView
        style={styles.centered}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🌱</Text>
          <Text style={styles.cardTitle}>Plant Age</Text>
          <Text style={styles.cardDesc}>
            Enter your aloe plant's approximate age in months (0 – 24)
          </Text>
          <TextInput
            style={styles.ageInput}
            keyboardType="number-pad"
            maxLength={2}
            value={plantAgeMonths}
            onChangeText={setPlantAgeMonths}
            placeholder="e.g. 6"
            placeholderTextColor="#444"
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity
            style={styles.greenBtn}
            onPress={() => {
              const age = parseInt(plantAgeMonths, 10);
              if (isNaN(age) || age < 0 || age > 24) {
                Alert.alert('Invalid Age', 'Please enter a number between 0 and 24.');
                return;
              }
              setShowAgeInput(false);
              setShowGuidelines(true);
            }}
          >
            <Text style={styles.greenBtnText}>Next Step →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ── Guidelines ────────────────────────────────────────────────────────────
  if (showGuidelines) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📋</Text>
          <Text style={styles.cardTitle}>Camera Protocols</Text>
          <View style={styles.protocolList}>
            <Text style={styles.protocolItem}>
              • <Text style={styles.bold}>Best Timing:</Text> Morning or Evening for optimal soft light.
            </Text>
            <Text style={styles.protocolItem}>
              • <Text style={styles.bold}>Lighting:</Text> Ensure bright, direct light falls on the aloe leaf.
            </Text>
            <Text style={styles.protocolItem}>
              • <Text style={styles.bold}>Step 1 (CNN):</Text> Keep leaf 5 cm from camera. Fit texture inside the square.
            </Text>
            <Text style={styles.protocolItem}>
              • <Text style={styles.bold}>Step 2 (Geo):</Text> Keep 1 m distance (top view). Fit whole plant in circle.
            </Text>
            <Text style={styles.protocolHint}>
              Farmers can use a tripod at 1 m for best GEO results.
            </Text>
          </View>
          <TouchableOpacity style={styles.greenBtn} onPress={() => setShowGuidelines(false)}>
            <Text style={styles.greenBtnText}>I Understand, Start Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Pick from gallery (CNN) ───────────────────────────────────────────────
  const handleGalleryPickCNN = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];

    try {
      setIsCapturing(true);
      const imgW = asset.width ?? SCREEN_W;
      const scale    = imgW / SCREEN_W;
      const cropSide = Math.round(GUIDE_SIZE * scale);
      const originX  = Math.round((imgW - cropSide) / 2);
      const imgH     = asset.height ?? SCREEN_H;
      const originY  = Math.round((imgH - cropSide) / 2);

      const manipulated = await manipulateAsync(
        asset.uri,
        [
          { crop: { originX, originY, width: cropSide, height: cropSide } },
          { resize: { width: 224, height: 224 } },
        ],
        { compress: 1.0, format: SaveFormat.JPEG }
      );
      setCnnImageUri(manipulated.uri);
      setStep('CNN_EDIT');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to process image.';
      Alert.alert('Error', msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Pick from gallery (GEO) ───────────────────────────────────────────────
  const handleGalleryPickGEO = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setGeoPhotoSize({ w: asset.width ?? SCREEN_W, h: asset.height ?? SCREEN_H });
    setGeoImageUri(asset.uri);
    setStep('GEO_EDIT');
  };

  // ── Camera capture ────────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0,
        base64: false,
        skipProcessing: false,
      });
      if (!photo?.uri) throw new Error('Failed to capture photo.');
      const { width: imgW, height: imgH } = photo;

      if (step === 'CNN') {
        const scale    = imgW / SCREEN_W;
        const cropSide = Math.round(GUIDE_SIZE * scale);
        const originX  = Math.round((imgW - cropSide) / 2);
        const originY  = Math.round((imgH - cropSide) / 2);
        const manipulated = await manipulateAsync(
          photo.uri,
          [
            { crop: { originX, originY, width: cropSide, height: cropSide } },
            { resize: { width: 224, height: 224 } },
          ],
          { compress: 1.0, format: SaveFormat.JPEG }
        );
        setCnnImageUri(manipulated.uri);
        setStep('CNN_EDIT');
        return;
      }

      if (step === 'GEO') {
        setGeoPhotoSize({ w: imgW, h: imgH });
        setGeoImageUri(photo.uri);
        setStep('GEO_EDIT');
        return;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Analyze ───────────────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!geoImageUri || !cnnImageUri || isCapturing || isAnalyzing) return;
    try {
      setIsAnalyzing(true);
      const age = parseInt(plantAgeMonths, 10) || 3;
      const roi = roiRef.current;
      const result = await predictMaturity(cnnImageUri, geoImageUri, roi, age);

      router.push({
        pathname: '/result',
        params: {
          imageUri:       geoImageUri,
          maturity:       result.ensemble_prediction.predicted_class,
          confidence:     String(result.ensemble_prediction.confidence),
          decisionReason: result.ensemble_prediction.decision_reason,
          geoArea:        String(result.geo_algorithm.detected_area),
          geoClass:       result.geo_algorithm.predicted_class,
          geoConfidence:  String(result.geo_algorithm.confidence),
          cnnClass:       result.cnn_model.predicted_class,
          cnnConfidence:  String(result.cnn_model.confidence),
          plantAge:       String(age),
          lowConfidence:  String(result.ensemble_prediction.low_confidence),
        },
      });

      // Reset
      setStep('CNN');
      setCnnImageUri(null);
      setGeoImageUri(null);
      setGeoPhotoSize(null);
      setShowAgeInput(true);
      setPlantAgeMonths('');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Analysis failed. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isLive    = step === 'CNN' || step === 'GEO';
  const isCNN     = step === 'CNN' || step === 'CNN_EDIT';
  const isCnnEdit = step === 'CNN_EDIT';
  const isGeoEdit = step === 'GEO_EDIT';

  return (
    <View style={styles.root}>

      {/* ── Camera / Review image ────────────────────────────────────────── */}
      {isLive ? (
        <CameraView
          ref={cameraRef}
          style={styles.fullscreen}
          facing={facing}
        />
      ) : isCnnEdit ? (
        <View style={styles.cnnEditBg}>
          <Image
            source={{ uri: cnnImageUri! }}
            style={styles.cnnEditImage}
            resizeMode="contain"
          />
          <View style={styles.cnnEditLabel}>
            <Text style={styles.cnnEditLabelText}>
              CNN Crop Preview — this is sent to the model
            </Text>
          </View>
        </View>
      ) : (
        // GEO edit — full screen contain, React Native handles aspect ratio correctly
        <View style={styles.geoEditBg}>
          <Image
            source={{ uri: geoImageUri! }}
            style={styles.geoEditImage}
            resizeMode="contain"
          />
        </View>
      )}

      {/* ── Step badge (live only) ─────────────────────────────────────────── */}
      {isLive && (
        <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.stepBadge}>
            <View style={styles.stepDots}>
              <View style={[styles.dot, isCNN && styles.dotActive]} />
              <View style={[styles.dot, !isCNN && styles.dotActive]} />
            </View>
            <Text style={styles.stepNum}>Step {isCNN ? '1' : '2'} of 2</Text>
            <Text style={styles.stepTitle}>
              {isCNN ? 'Close-Up Details' : 'Full Plant Capture'}
            </Text>
            <Text style={styles.stepDesc}>
              {isCNN
                ? 'Align leaf texture inside the square'
                : 'Capture the whole plant from above (1 m)'}
            </Text>
          </View>
        </SafeAreaView>
      )}

      {/* ── CNN guide square (LIVE step 1 only) ──────────────────────────── */}
      {step === 'CNN' && (
        <View style={styles.guideOverlay} pointerEvents="none">
          <View style={[styles.darkMask, { height: (SCREEN_H - GUIDE_SIZE) / 2, width: SCREEN_W }]} />
          <View style={{ flexDirection: 'row', height: GUIDE_SIZE }}>
            <View style={[styles.darkMask, { width: (SCREEN_W - GUIDE_SIZE) / 2 }]} />
            <View style={styles.guideBox}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={[styles.darkMask, { width: (SCREEN_W - GUIDE_SIZE) / 2 }]} />
          </View>
          <View style={[styles.darkMask, { flex: 1, width: SCREEN_W, alignItems: 'center', paddingTop: 12 }]}>
            <Text style={styles.guideLabel}>Align leaf texture here</Text>
          </View>
        </View>
      )}

      {/* ── GEO live hint ─────────────────────────────────────────────────── */}
      {step === 'GEO' && (
        <View style={styles.geoHintWrap} pointerEvents="none">
          <Text style={styles.guideLabel}>Fit whole plant in view and snap</Text>
        </View>
      )}

      {/* ── GEO edit: resizable ROI circle ────────────────────────────────── */}
      {isGeoEdit && (
        <View style={StyleSheet.absoluteFillObject}>
          <ResizableCircle
            onROIChange={(roi) => (roiRef.current = roi)}
            imageAspect={geoPhotoSize ? geoPhotoSize.w / geoPhotoSize.h : SCREEN_W / SCREEN_H}
          />
        </View>
      )}

      {/* ── Analyzing overlay ─────────────────────────────────────────────── */}
      {isAnalyzing && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginBottom: 16 }} />
            <Text style={styles.analyzingLabel}>{statusLabel}</Text>
            <Text style={styles.analyzingHint}>This may take up to 30 s on first run</Text>
          </View>
        </View>
      )}

      {/* ── Bottom controls ───────────────────────────────────────────────── */}
      {!isAnalyzing && (
        <View style={styles.bottomControls}>
          {/* Back / Retake */}
          {step !== 'CNN' && (
            <TouchableOpacity
              style={styles.redoBtn}
              onPress={() => {
                if (step === 'CNN_EDIT')      { setStep('CNN'); setCnnImageUri(null); }
                else if (step === 'GEO')      { setStep('CNN_EDIT'); }
                else if (step === 'GEO_EDIT') { setStep('GEO'); setGeoImageUri(null); }
              }}
            >
              <Text style={styles.redoBtnText}>
                {(isCnnEdit || isGeoEdit) ? '← Retake' : '← Back'}
              </Text>
            </TouchableOpacity>
          )}

          {isLive ? (
            /* Camera step: Gallery | Shutter */
            <View style={styles.liveButtonGroup}>
              {/* Gallery picker */}
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={step === 'CNN' ? handleGalleryPickCNN : handleGalleryPickGEO}
                disabled={isCapturing}
              >
                <Text style={styles.galleryBtnText}>🖼️{'\n'}Gallery</Text>
              </TouchableOpacity>

              {/* Shutter */}
              <TouchableOpacity
                style={[styles.shutter, isCapturing && styles.disabled]}
                onPress={handleCapture}
                disabled={isCapturing}
              >
                {isCapturing
                  ? <ActivityIndicator color="#4CAF50" size="large" />
                  : <View style={styles.shutterInner} />}
              </TouchableOpacity>

              {/* Spacer to keep shutter centred */}
              <View style={{ width: 64 }} />
            </View>
          ) : (
            /* Edit step: Confirm */
            <TouchableOpacity
              style={[styles.confirmBtn, isCapturing && styles.disabled]}
              onPress={isCnnEdit ? () => setStep('GEO') : handleAnalyze}
              disabled={isCapturing}
            >
              {isCapturing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmBtnText}>
                    {isCnnEdit ? 'Next: Full Plant →' : 'Confirm & Analyze'}
                  </Text>}
            </TouchableOpacity>
          )}

          {step !== 'CNN' && !isLive && <View style={{ width: 90 }} />}
        </View>
      )}

    </View>
  );
}

// Corner mark dimensions
const C_LEN = 24;
const C_W   = 3;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  fullscreen: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // GEO edit: cover fills entire screen — NO black bars
  geoEditBg: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  geoEditImage: {
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // CNN edit
  cnnEditBg: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cnnEditImage: {
    width:  SCREEN_W * 0.80,
    height: SCREEN_W * 0.80,
  },
  cnnEditLabel: {
    position: 'absolute',
    bottom: 180,
    left: 0, right: 0,
    alignItems: 'center',
  },
  cnnEditLabelText: {
    color: '#4CAF50',
    fontSize: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Guide overlay
  guideOverlay: {
    position: 'absolute',
    top: 0, left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },
  darkMask: { backgroundColor: 'rgba(0,0,0,0.55)' },
  guideBox: {
    width: GUIDE_SIZE,
    height: GUIDE_SIZE,
  },

  corner:    { position: 'absolute', borderColor: '#4CAF50' },
  cornerTL:  { top: 0,    left: 0,  width: C_LEN, height: C_LEN, borderTopWidth: C_W,    borderLeftWidth: C_W  },
  cornerTR:  { top: 0,    right: 0, width: C_LEN, height: C_LEN, borderTopWidth: C_W,    borderRightWidth: C_W },
  cornerBL:  { bottom: 0, left: 0,  width: C_LEN, height: C_LEN, borderBottomWidth: C_W, borderLeftWidth: C_W  },
  cornerBR:  { bottom: 0, right: 0, width: C_LEN, height: C_LEN, borderBottomWidth: C_W, borderRightWidth: C_W },

  guideLabel: {
    color: '#4CAF50',
    fontSize: 13,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    overflow: 'hidden',
  },
  geoHintWrap: {
    position: 'absolute',
    bottom: 160,
    width: '100%',
    alignItems: 'center',
  },

  topOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 20,
  },
  stepBadge: {
    margin: 16,
    backgroundColor: 'rgba(0,0,0,0.72)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.3)',
  },
  stepDots:  { flexDirection: 'row', gap: 6, marginBottom: 6 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#555' },
  dotActive: { backgroundColor: '#4CAF50' },
  stepNum:   { color: '#4CAF50', fontSize: 11, fontWeight: '600', marginBottom: 2 },
  stepTitle: { color: '#fff', fontSize: 15, fontWeight: 'bold', marginBottom: 2 },
  stepDesc:  { color: '#ccc', fontSize: 12 },

  // Bottom controls
  bottomControls: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 24,
    gap: 20,
  },
  liveButtonGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    flex: 1,
    justifyContent: 'center',
  },
  galleryBtn: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#fff',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  shutter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 5, borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 10,
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#4CAF50' },
  disabled:     { opacity: 0.45 },
  redoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 20, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  redoBtnText:    { color: '#fff', fontSize: 13, fontWeight: '500' },
  confirmBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14, paddingHorizontal: 32,
    borderRadius: 30, minWidth: 160, alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // Analyzing overlay
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  analyzingCard: {
    backgroundColor: '#1b1b1b',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    minWidth: 260,
  },
  analyzingLabel: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  analyzingHint: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },

  // Non-camera screens
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#111', padding: 24,
  },
  card: {
    width: '100%', alignItems: 'center',
    backgroundColor: '#1b1b1b', borderRadius: 20,
    padding: 28, borderWidth: 1, borderColor: '#2a2a2a',
  },
  cardEmoji:    { fontSize: 52, marginBottom: 14 },
  cardTitle:    { color: '#4CAF50', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  cardDesc:     { color: '#888', textAlign: 'center', marginBottom: 24, lineHeight: 20, fontSize: 14 },
  greenBtn:     { backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 44, borderRadius: 12 },
  greenBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  ageInput: {
    width: 160, padding: 14, fontSize: 26, textAlign: 'center',
    backgroundColor: '#111', color: '#fff',
    borderWidth: 2, borderColor: '#4CAF50', borderRadius: 12, marginBottom: 22,
  },
  protocolList: { width: '100%', marginVertical: 20, gap: 12 },
  protocolItem: { color: '#ccc', fontSize: 14, lineHeight: 20 },
  bold:         { fontWeight: 'bold', color: '#4CAF50' },
  protocolHint: { color: '#888', fontSize: 13, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
});