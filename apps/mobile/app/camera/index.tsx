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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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

const STATUS_STEPS = [
  { label: 'Connecting to server...',  duration: 4000  },
  { label: 'Uploading images...',      duration: 3000  },
  { label: 'Running CNN model...',     duration: 5000  },
  { label: 'Running Geo algorithm...', duration: 5000  },
  { label: 'Calculating result...',    duration: 99999 },
];

function useStatusCycle(active: boolean) {
  const [idx, setIdx] = useState(0);
  const timerRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef     = useRef(active);
  activeRef.current   = active;

  React.useEffect(() => {
    if (!active) { setIdx(0); return; }
    let current = 0;
    const schedule = () => {
      if (!activeRef.current || current >= STATUS_STEPS.length - 1) return;
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

/**
 * ✅ FIXED: Compute the actual rendered rect of an image displayed with
 * resizeMode="contain" inside a container of size (cW × cH).
 *
 * THE BUG IN THE OLD VERSION:
 *   return { rendW: cW, rendH: cH, offsetX: 0, offsetY: 0, photoW: imgW, photoH: imgH }
 *   This always returned full screen dimensions regardless of image aspect ratio.
 *
 * WHY THIS BREAKS GALLERY PREDICTIONS:
 *   A landscape gallery photo (4032×3024) on a 390×844 portrait screen renders
 *   at 390×292 with 276px black bars top and bottom (letterboxed).
 *   The old code told ResizableCircle the rendered size was 390×844 (full screen).
 *   ResizableCircle then computed roi_r using the wrong canvas height.
 *   The computed area was (844/292)² = 8.4× too small → always below T1 → always IMMATURE.
 *
 * THE FIX:
 *   Compute the true letterbox/pillarbox rectangle from the image aspect ratio.
 *   - Image wider than screen  → fill width,  letterbox top/bottom
 *   - Image taller than screen → fill height, pillarbox left/right
 */
function getContainRect(imgW: number, imgH: number, cW: number, cH: number) {
  const imageAspect  = imgW / imgH;
  const screenAspect = cW  / cH;

  let rendW: number, rendH: number, offsetX: number, offsetY: number;

  if (imageAspect > screenAspect) {
    // Image wider than container → fill width, letterbox top/bottom
    rendW   = cW;
    rendH   = cW / imageAspect;
    offsetX = 0;
    offsetY = (cH - rendH) / 2;
  } else {
    // Image taller than container → fill height, pillarbox left/right
    rendH   = cH;
    rendW   = cH * imageAspect;
    offsetX = (cW - rendW) / 2;
    offsetY = 0;
  }

  return { rendW, rendH, offsetX, offsetY, photoW: imgW, photoH: imgH };
}

/**
 * If the screen orientation and photo orientation disagree
 * (e.g. portrait screen but landscape photo dims from EXIF),
 * swap the dimensions so min/max are always consistent with
 * what the user actually sees on screen.
 */
function normalisePhotoDims(w: number, h: number): { w: number; h: number } {
  const screenIsPortrait = SCREEN_H > SCREEN_W;
  const photoIsPortrait  = h > w;
  if (screenIsPortrait !== photoIsPortrait) {
    return { w: h, h: w };
  }
  return { w, h };
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
  const roiRef    = useRef({ x: 0.5, y: 0.5, r: 0.40 });
  const statusLabel = useStatusCycle(isAnalyzing);

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#4CAF50" /></View>;
  }

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

  if (showAgeInput) {
    return (
      <KeyboardAvoidingView style={styles.centered} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>🌱</Text>
          <Text style={styles.cardTitle}>Plant Age</Text>
          <Text style={styles.cardDesc}>Enter your aloe plant's approximate age in months (0 – 24)</Text>
          <TextInput
            style={styles.ageInput}
            keyboardType="number-pad"
            maxLength={2}
            value={plantAgeMonths}
            onChangeText={setPlantAgeMonths}
            placeholder="e.g. 6"
            placeholderTextColor="#9DB8A0"
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity style={styles.greenBtn} onPress={() => {
            const age = parseInt(plantAgeMonths, 10);
            if (isNaN(age) || age < 0 || age > 24) {
              Alert.alert('Invalid Age', 'Please enter a number between 0 and 24.');
              return;
            }
            setShowAgeInput(false);
            setShowGuidelines(true);
          }}>
            <Text style={styles.greenBtnText}>Next Step →</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (showGuidelines) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.card}>
          <Text style={styles.cardEmoji}>📋</Text>
          <Text style={styles.cardTitle}>Camera Protocols</Text>
          <View style={styles.protocolList}>
            <View style={styles.protocolRow}>
              <View style={styles.protocolAccent} />
              <Text style={styles.protocolItem}><Text style={styles.bold}>Best Timing:</Text> Morning or Evening for optimal soft light.</Text>
            </View>
            <View style={styles.protocolRow}>
              <View style={styles.protocolAccent} />
              <Text style={styles.protocolItem}><Text style={styles.bold}>Lighting:</Text> Ensure bright, direct light falls on the aloe leaf.</Text>
            </View>
            <View style={styles.protocolRow}>
              <View style={styles.protocolAccent} />
              <Text style={styles.protocolItem}><Text style={styles.bold}>Step 1 (CNN):</Text> Keep leaf 5 cm from camera. Fit texture inside the square.</Text>
            </View>
            <View style={styles.protocolRow}>
              <View style={styles.protocolAccent} />
              <Text style={styles.protocolItem}><Text style={styles.bold}>Step 2 (Geo):</Text> Keep 1 m distance (top view). Fit whole plant in circle.</Text>
            </View>
            <View style={styles.protocolDivider} />
            <Text style={styles.protocolHint}>Farmers can use a tripod at 1 m for best GEO results.</Text>
          </View>
          <TouchableOpacity style={styles.greenBtn} onPress={() => setShowGuidelines(false)}>
            <Text style={styles.greenBtnText}>I Understand, Start Scan</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Gallery: CNN
  // Mirror live-camera crop: project GUIDE_SIZE onto the photo's pixel space
  // using (imgW / SCREEN_W) as the scale factor.
  // ---------------------------------------------------------------------------
  const handleGalleryPickCNN = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      setIsCapturing(true);

      const imgW = asset.width  ?? SCREEN_W;
      const imgH = asset.height ?? SCREEN_H;

      // Scale the guide box to the photo's pixel space, then clamp to the
      // shorter dimension so the crop square always fits inside the image.
      // Without the clamp, wide landscape photos (e.g. 16:9 at 4032×2268)
      // produce a cropSide larger than imgH, making originY negative and
      // crashing expo-image-manipulator with "crop rectangle outside image".
      const scale    = imgW / SCREEN_W;
      const cropSide = Math.min(
        Math.round(GUIDE_SIZE * scale),
        imgW,
        imgH,
      );
      const originX  = Math.max(0, Math.round((imgW - cropSide) / 2));
      const originY  = Math.max(0, Math.round((imgH - cropSide) / 2));

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
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to process image.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Gallery: GEO
  // Apply normalisePhotoDims() so min(w,h) always matches visual orientation.
  // ---------------------------------------------------------------------------
  const handleGalleryPickGEO = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images' as any,
        allowsEditing: false,
        quality: 1,
      });
      if (result.canceled || !result.assets[0]) return;
      const asset = result.assets[0];

      const trueDims = await new Promise<{ w: number; h: number }>((resolve) => {
        Image.getSize(
          asset.uri,
          (w, h) => resolve({ w, h }),
          () => resolve({ w: asset.width ?? SCREEN_W, h: asset.height ?? SCREEN_H })
        );
      });

      const normDims = normalisePhotoDims(trueDims.w, trueDims.h);

      setGeoPhotoSize(normDims);
      setGeoImageUri(asset.uri);
      roiRef.current = { x: 0.5, y: 0.5, r: 0.40 };
      setStep('GEO_EDIT');
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to pick image.');
    }
  };

  // ---------------------------------------------------------------------------
  // Live camera capture
  // ---------------------------------------------------------------------------
  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePictureAsync({ quality: 1.0, base64: false, skipProcessing: false });
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
        const normDims = normalisePhotoDims(imgW, imgH);
        setGeoPhotoSize(normDims);
        setGeoImageUri(photo.uri);
        roiRef.current = { x: 0.5, y: 0.5, r: 0.40 };
        setStep('GEO_EDIT');
        return;
      }
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Analyze
  // ---------------------------------------------------------------------------
  const handleAnalyze = async () => {
    if (!geoImageUri || !cnnImageUri || isCapturing || isAnalyzing) return;
    try {
      setIsAnalyzing(true);
      const age = parseInt(plantAgeMonths, 10) || 3;
      const result = await predictMaturity(cnnImageUri, geoImageUri, roiRef.current, age);

      router.push({
        pathname: '/result' as any,
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

      setStep('CNN');
      setCnnImageUri(null);
      setGeoImageUri(null);
      setGeoPhotoSize(null);
      setShowAgeInput(true);
      setPlantAgeMonths('');
      roiRef.current = { x: 0.5, y: 0.5, r: 0.40 };
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const isLive    = step === 'CNN' || step === 'GEO';
  const isCNN     = step === 'CNN' || step === 'CNN_EDIT';
  const isCnnEdit = step === 'CNN_EDIT';
  const isGeoEdit = step === 'GEO_EDIT';

  // ✅ FIXED: getContainRect now returns the true letterbox/pillarbox rect.
  // ResizableCircle uses this to compute roi_r correctly for gallery images.
  const geoContainRect = geoPhotoSize
    ? getContainRect(geoPhotoSize.w, geoPhotoSize.h, SCREEN_W, SCREEN_H)
    : { rendW: SCREEN_W, rendH: SCREEN_H, offsetX: 0, offsetY: 0, photoW: SCREEN_W, photoH: SCREEN_H };

  return (
    <View style={styles.root}>

      {isLive ? (
        <CameraView ref={cameraRef} style={styles.fullscreen} facing={facing} />
      ) : isCnnEdit ? (
        <View style={styles.cnnEditBg}>
          <Image source={{ uri: cnnImageUri! }} style={styles.cnnEditImage} resizeMode="contain" />
          <View style={styles.cnnEditLabel}>
            <Text style={styles.cnnEditLabelText}>CNN Crop Preview — this is sent to the model</Text>
          </View>
        </View>
      ) : (
        <View style={styles.geoEditBg}>
          <Image source={{ uri: geoImageUri! }} style={styles.geoEditImage} resizeMode="contain" />
        </View>
      )}

      {isLive && (
        <SafeAreaView style={styles.topOverlay} pointerEvents="box-none">
          <View style={styles.stepBadge}>
            <View style={styles.stepDots}>
              <View style={[styles.dot, isCNN && styles.dotActive]} />
              <View style={[styles.dot, !isCNN && styles.dotActive]} />
            </View>
            <Text style={styles.stepNum}>Step {isCNN ? '1' : '2'} of 2</Text>
            <Text style={styles.stepTitle}>{isCNN ? 'Close-Up Details' : 'Full Plant Capture'}</Text>
            <Text style={styles.stepDesc}>{isCNN ? 'Align leaf texture inside the square' : 'Capture the whole plant from above (1 m)'}</Text>
          </View>
        </SafeAreaView>
      )}

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
          <View style={[styles.darkMask, { flex: 1, width: SCREEN_W, alignItems: 'center', paddingTop: 16 }]}>
            <Text style={styles.guideLabel}>Align leaf texture here</Text>
          </View>
        </View>
      )}

      {step === 'GEO' && (
        <View style={styles.geoHintWrap} pointerEvents="none">
          <Text style={styles.guideLabel}>Fit whole plant in view and snap</Text>
        </View>
      )}

      {isGeoEdit && (
        <View style={StyleSheet.absoluteFillObject}>
          <ResizableCircle
            onROIChange={(roi) => { roiRef.current = roi; }}
            containRect={geoContainRect}
          />
          <View style={styles.geoResizeBadge} pointerEvents="none">
            <Text style={styles.geoResizeBadgeText}>
              ⚠️  Resize circle to cover all leaf tips exactly
            </Text>
          </View>
        </View>
      )}

      {isAnalyzing && (
        <View style={styles.analyzingOverlay}>
          <View style={styles.analyzingCard}>
            <View style={styles.analyzingTopBar} />
            <ActivityIndicator size="large" color="#4CAF50" style={{ marginBottom: 20 }} />
            <Text style={styles.analyzingLabel}>{statusLabel}</Text>
            <Text style={styles.analyzingHint}>This may take up to 30 s on first run</Text>
          </View>
        </View>
      )}

      {!isAnalyzing && (
        <View style={styles.bottomControls}>
          {step !== 'CNN' && (
            <TouchableOpacity
              style={styles.redoBtn}
              onPress={() => {
                if (step === 'CNN_EDIT')      { setStep('CNN'); setCnnImageUri(null); }
                else if (step === 'GEO')      { setStep('CNN_EDIT'); }
                else if (step === 'GEO_EDIT') { setStep('GEO'); setGeoImageUri(null); setGeoPhotoSize(null); }
              }}
            >
              <Text style={styles.redoBtnText}>{(isCnnEdit || isGeoEdit) ? '← Retake' : '← Back'}</Text>
            </TouchableOpacity>
          )}

          {isLive ? (
            <View style={styles.liveButtonGroup}>
              <TouchableOpacity
                style={styles.galleryBtn}
                onPress={step === 'CNN' ? handleGalleryPickCNN : handleGalleryPickGEO}
                disabled={isCapturing}
              >
                <Text style={styles.galleryBtnIcon}>🖼️</Text>
                <Text style={styles.galleryBtnText}>Gallery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.shutter, isCapturing && styles.disabled]}
                onPress={handleCapture}
                disabled={isCapturing}
              >
                {isCapturing
                  ? <ActivityIndicator color="#4CAF50" size="large" />
                  : <View style={styles.shutterInner} />}
              </TouchableOpacity>
              <View style={{ width: 66 }} />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.confirmBtn, isCapturing && styles.disabled]}
              onPress={isCnnEdit ? () => setStep('GEO') : handleAnalyze}
              disabled={isCapturing}
            >
              {isCapturing
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.confirmBtnText}>{isCnnEdit ? 'Next: Full Plant →' : 'Confirm & Analyze'}</Text>}
            </TouchableOpacity>
          )}

          {step !== 'CNN' && !isLive && <View style={{ width: 90 }} />}
        </View>
      )}
    </View>
  );
}

const C_LEN = 26;
const C_W   = 3.5;

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#000' },
  fullscreen:  { position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: SCREEN_H },

  geoEditBg:        { position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000' },
  geoEditImage:     { width: SCREEN_W, height: SCREEN_H, resizeMode: 'contain' },
  cnnEditBg:        { position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: SCREEN_H, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  cnnEditImage:     { width: SCREEN_W * 0.80, height: SCREEN_W * 0.80, borderRadius: 14 },
  cnnEditLabel:     { position: 'absolute', bottom: 180, left: 0, right: 0, alignItems: 'center' },
  cnnEditLabelText: { color: '#4CAF50', fontSize: 13, fontWeight: '600', letterSpacing: 0.2, backgroundColor: 'rgba(0,0,0,0.68)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },

  guideOverlay: { position: 'absolute', top: 0, left: 0, width: SCREEN_W, height: SCREEN_H },
  darkMask:     { backgroundColor: 'rgba(0,0,0,0.55)' },
  guideBox:     { width: GUIDE_SIZE, height: GUIDE_SIZE },
  corner:       { position: 'absolute', borderColor: '#4CAF50' },
  cornerTL:     { top: 0,    left: 0,  width: C_LEN, height: C_LEN, borderTopWidth: C_W,    borderLeftWidth: C_W  },
  cornerTR:     { top: 0,    right: 0, width: C_LEN, height: C_LEN, borderTopWidth: C_W,    borderRightWidth: C_W },
  cornerBL:     { bottom: 0, left: 0,  width: C_LEN, height: C_LEN, borderBottomWidth: C_W, borderLeftWidth: C_W  },
  cornerBR:     { bottom: 0, right: 0, width: C_LEN, height: C_LEN, borderBottomWidth: C_W, borderRightWidth: C_W },
  guideLabel:   { color: '#4CAF50', fontSize: 13, fontWeight: '600', letterSpacing: 0.3, backgroundColor: 'rgba(0,0,0,0.68)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, overflow: 'hidden' },
  geoHintWrap:  { position: 'absolute', bottom: 160, width: '100%', alignItems: 'center' },

  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 20 },
  stepBadge: {
    margin: 16,
    backgroundColor: 'rgba(0,0,0,0.76)',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.35)',
  },
  stepDots:  { flexDirection: 'row', gap: 6, marginBottom: 8 },
  dot:       { width: 7, height: 7, borderRadius: 4, backgroundColor: '#444' },
  dotActive: { backgroundColor: '#4CAF50', width: 20, borderRadius: 4 },
  stepNum:   { color: '#4CAF50', fontSize: 11, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 },
  stepTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 3, letterSpacing: 0.2 },
  stepDesc:  { color: '#bbb', fontSize: 12, letterSpacing: 0.1 },

  bottomControls: {
    position: 'absolute',
    bottom: 52,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
    paddingHorizontal: 24,
    gap: 20,
  },
  liveButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 28, flex: 1, justifyContent: 'center' },
  galleryBtn: {
    width: 66,
    height: 66,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 3,
  },
  galleryBtnIcon: { fontSize: 22 },
  galleryBtnText: { color: '#fff', fontSize: 10, fontWeight: '600', letterSpacing: 0.4 },
  shutter: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: 'rgba(255,255,255,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 12,
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#4CAF50' },
  disabled:     { opacity: 0.45 },
  redoBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  redoBtnText: { color: '#fff', fontSize: 13, fontWeight: '600', letterSpacing: 0.2 },
  confirmBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 32,
    minWidth: 172,
    alignItems: 'center',
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.38,
    shadowRadius: 12,
    elevation: 8,
  },
  confirmBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },

  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.80)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 50,
  },
  analyzingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 0,
    paddingBottom: 36,
    paddingHorizontal: 36,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 10,
    minWidth: 270,
    overflow: 'hidden',
  },
  analyzingTopBar: {
    height: 5,
    width: '100%',
    backgroundColor: '#4CAF50',
    marginBottom: 32,
    borderRadius: 0,
  },
  analyzingLabel: { color: '#1B5E20', fontSize: 16, fontWeight: '800', marginBottom: 8, textAlign: 'center', letterSpacing: 0.3 },
  analyzingHint:  { color: '#78909C', fontSize: 12, textAlign: 'center', letterSpacing: 0.1 },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA', padding: 24 },
  card: {
    width: '100%',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#1B5E20',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  cardEmoji:    { fontSize: 56, marginBottom: 16 },
  cardTitle:    { color: '#1B5E20', fontSize: 23, fontWeight: '800', marginBottom: 10, letterSpacing: 0.3, textAlign: 'center' },
  cardDesc:     { color: '#546E7A', textAlign: 'center', marginBottom: 28, lineHeight: 22, fontSize: 15 },
  greenBtn: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 14,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 5,
  },
  greenBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.4 },
  ageInput: {
    width: 160,
    paddingVertical: 16,
    paddingHorizontal: 14,
    fontSize: 28,
    textAlign: 'center',
    backgroundColor: '#F1F8F2',
    color: '#1B5E20',
    fontWeight: 'bold',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderRadius: 14,
    marginBottom: 24,
  },

  protocolList:    { width: '100%', marginVertical: 20, gap: 14 },
  protocolRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  protocolAccent:  { width: 3, minHeight: 18, borderRadius: 2, backgroundColor: '#4CAF50', marginTop: 3, flexShrink: 0 },
  protocolItem:    { color: '#546E7A', fontSize: 14, lineHeight: 22, flex: 1 },
  bold:            { fontWeight: '700', color: '#1B5E20' },
  protocolDivider: { height: 1, backgroundColor: '#E8F5E9', width: '100%', marginVertical: 4 },
  protocolHint:    { color: '#78909C', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },

  // Resize hint badge shown on GEO_EDIT screen for gallery images
  geoResizeBadge: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,193,7,0.6)',
    alignItems: 'center',
  },
  geoResizeBadgeText: {
    color: '#FFC107',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});