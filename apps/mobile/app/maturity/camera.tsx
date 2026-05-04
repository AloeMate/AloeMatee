import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import ResizableCircle, { ContainRect } from '../../components/ResizableCircle';
import { predictMaturity } from '../../utils/maturity_api';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// The Colab model uses Resize(256) -> CenterCrop(224). 
// This means the model sees exactly 224/256 = 87.5% of the shortest edge.
// We set the guide fraction to exactly match this mathematical crop!
const CNN_GUIDE_FRACTION = 0.875;
const GUIDE_SIZE         = SCREEN_W * CNN_GUIDE_FRACTION;

// Standard Android sensor ratio is 4:3. 
// We must render the camera in exactly 3:4 (portrait) to prevent deceptive "cover" letterboxing.
const CAM_H = SCREEN_W * (4/3);

type CaptureStep = 'CNN' | 'CNN_EDIT' | 'GEO' | 'GEO_EDIT';

// ── Status messages shown during analyze ─────────────────────────────────────
const STATUS_STEPS = [
  { label: 'Connecting to server…',  duration: 4000  },
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
  const [geoContainRect, setGeoContainRect] = useState<ContainRect | null>(null);
  const [showGuidelines, setShowGuidelines] = useState(true);

  const cameraRef = useRef<CameraView>(null);
  const router    = useRouter();
  const roiRef    = useRef({ x: 0.5, y: 0.5, r: 0.35 });

  // ── Compute "contain" letterbox rect so ROI is normalised correctly ──────
  const computeContainRect = (photoW: number, photoH: number): ContainRect => {
    const photoAspect  = photoW / photoH;
    const screenAspect = SCREEN_W / SCREEN_H;
    let rendW: number, rendH: number;
    if (photoAspect > screenAspect) {
      rendW = SCREEN_W;
      rendH = SCREEN_W / photoAspect;
    } else {
      rendH = SCREEN_H;
      rendW = SCREEN_H * photoAspect;
    }
    return {
      rendW,
      rendH,
      offsetX: (SCREEN_W - rendW) / 2,
      offsetY: (SCREEN_H - rendH) / 2,
      photoW,
      photoH,
    };
  };

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

  // ── Guidelines ────────────────────────────────────────────────────────────
  if (showGuidelines) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📋</Text>
          <Text style={styles.cardTitle}>Camera Protocols</Text>
          <View style={styles.protocolList}>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Best Timing:</Text> Morning or Evening for optimal soft light.</Text>
            </View>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Lighting:</Text> Ensure bright, direct light falls on the aloe leaf.</Text>
            </View>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Step 1 (CNN):</Text> Keep leaf 5 cm from camera. Fit texture inside the square.</Text>
            </View>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Step 2 (Geo):</Text> Keep 1 m distance (top view). Fit whole plant in circle.</Text>
            </View>
            <Text style={[styles.cardTitle, { marginTop: 16, fontSize: 18 }]}>Plant Conditions</Text>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Watering:</Text> Do not scan over-watered or waterlogged plants.</Text>
            </View>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Growth:</Text> Avoid scanning artificially over-grown plants.</Text>
            </View>
            <View style={styles.protocolRow}>
              <Text style={styles.protocolBullet}>•</Text>
              <Text style={styles.protocolItem}><Text style={styles.bold}>Health:</Text> Select plants free of major diseases or severe damage.</Text>
            </View>

            <Text style={styles.protocolHint}>
              Farmers can use a tripod at 1 m for best GEO results.{'\n'}
              Following these protocols and plant conditions ensures you get the most accurate results.
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

      setCnnImageUri(asset.uri);
      setStep('CNN_EDIT');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to process image.';
      Alert.alert('Error', msg);
    } finally {
      setIsCapturing(false);
    }
  };

  // ── Pick from gallery (GEO) ───────────────────────────────────────────────
  // FIX: Use manipulateAsync zero-op pass (same as CNN path) to get EXIF-corrected
  // visual dimensions instead of relying on unreliable asset.exif?.Orientation metadata.
  // The old approach using exif orientation flags was silently producing wrong dimensions
  // on Android, causing an incorrect containRect → wrong roi_r → wrong geo area → bad prediction.
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

    try {
      setIsCapturing(true);
      const normalized = await manipulateAsync(
        asset.uri,
        [{ rotate: 0 }],
        { compress: 1.0, format: SaveFormat.JPEG }
      );
      const visualW = normalized.width;
      const visualH = normalized.height;
      setGeoImageUri(normalized.uri);
      setGeoContainRect(computeContainRect(visualW, visualH));
      setStep('GEO_EDIT');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to process image.';
      Alert.alert('Error', msg);
    } finally {
      setIsCapturing(false);
    }
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
        setCnnImageUri(photo.uri);
        setStep('CNN_EDIT');
        return;
      }

      if (step === 'GEO') {
        // FIX: The captured photo is displayed in <Image resizeMode="contain">,
        // so it DOES have letterboxing! We must compute containRect just like Gallery.
        // manipulateAsync guarantees EXIF rotation is baked and gives exact visual dims.
        const normalized = await manipulateAsync(
          photo.uri,
          [{ rotate: 0 }],
          { compress: 1.0, format: SaveFormat.JPEG }
        );
        
        setGeoContainRect(computeContainRect(normalized.width, normalized.height));
        setGeoImageUri(normalized.uri);
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
      const roi = roiRef.current;
      const result = await predictMaturity(cnnImageUri, geoImageUri, roi);

      router.push({
        pathname: '/maturity/result',
        params: {
          imageUri:        geoImageUri,
          isAloeVera:      String(result.is_aloe_vera),
          cnnClass:        result.cnn_model.predicted_class,
          cnnConfidence:   String(result.cnn_model.confidence),
          geoArea:         result.geo_algorithm ? String(result.geo_algorithm.detected_area) : '',
          geoClass:        result.geo_algorithm ? result.geo_algorithm.predicted_class : '',
          geoConfidence:   result.geo_algorithm ? String(result.geo_algorithm.confidence) : '',
          classesMatch:    String(result.classes_match),
          harvestRequired: String(result.harvest_required),
          harvestMessage:  result.harvest_message ?? '',
        },
      });

      // Reset
      setStep('CNN');
      setCnnImageUri(null);
      setGeoImageUri(null);
      setGeoContainRect(null);
      setShowGuidelines(true);
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
          style={styles.cameraPreview}
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
            containRect={geoContainRect ?? undefined}
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
          {/* Left Column: Back / Retake (Far Left) */}
          <View style={styles.leftControls}>
            {step !== 'CNN' && (
              <TouchableOpacity
                style={styles.redoBtn}
                onPress={() => {
                  if (step === 'CNN_EDIT')      { setStep('CNN'); setCnnImageUri(null); }
                  else if (step === 'GEO')      { setStep('CNN_EDIT'); }
                  else if (step === 'GEO_EDIT') { setStep('GEO'); setGeoImageUri(null); setGeoContainRect(null); }
                }}
              >
                <Text style={styles.redoBtnText}>
                  {(isCnnEdit || isGeoEdit) ? '← Retake' : '← Back'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Absolute Center: Gallery + Shutter */}
          <View style={styles.absoluteCenter} pointerEvents="box-none">
            {/* Gallery (Anchored to the left of Shutter) */}
            {isLive && (
              <View style={styles.galleryWrapper}>
                <TouchableOpacity
                  style={[styles.galleryBtn, isCapturing && styles.disabled]}
                  onPress={step === 'CNN' ? handleGalleryPickCNN : handleGalleryPickGEO}
                  disabled={isCapturing}
                >
                  <Text style={styles.galleryBtnText}>🖼️{'\n'}Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Shutter / Confirm */}
            {isLive ? (
              <TouchableOpacity
                style={[styles.shutter, isCapturing && styles.disabled]}
                onPress={handleCapture}
                disabled={isCapturing}
              >
                {isCapturing
                  ? <ActivityIndicator color="#4CAF50" size="large" />
                  : <View style={styles.shutterInner} />}
              </TouchableOpacity>
            ) : (
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
          </View>
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

  cameraPreview: {
    position: 'absolute',
    top: (SCREEN_H - CAM_H) / 2, // Center the camera vertically
    left: 0,
    width: SCREEN_W,
    height: CAM_H, // Exactly 3:4 aspect ratio
  },

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

  bottomControls: {
    position: 'absolute',
    bottom: 48,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 12,
  },
  leftControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  absoluteCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  galleryWrapper: {
    position: 'absolute',
    right: '50%',
    marginRight: 48, // 40 (half shutter) + 8 (gap)
  },
  galleryBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryBtnText: {
    color: '#fff',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
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
    paddingVertical: 10, paddingHorizontal: 12,
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

  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#F8F9FA', padding: 24,
  },
  card: {
    width: '100%', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 20,
    padding: 28, borderWidth: 1, borderColor: '#eee',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardEmoji:    { fontSize: 52, marginBottom: 14 },
  cardTitle:    { color: '#2E7D32', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  cardDesc:     { color: '#555', textAlign: 'center', marginBottom: 24, lineHeight: 20, fontSize: 14 },
  greenBtn:     { backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 44, borderRadius: 12 },
  greenBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  protocolList: { width: '100%', marginVertical: 20 },
  protocolRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  protocolBullet: { color: '#444', fontSize: 16, marginRight: 8, marginTop: -2 },
  protocolItem: { color: '#444', fontSize: 14, lineHeight: 20, flex: 1 },
  bold:         { fontWeight: 'bold', color: '#2E7D32' },
  protocolHint: { color: '#777', fontSize: 13, fontStyle: 'italic', marginTop: 8, textAlign: 'center' },
});