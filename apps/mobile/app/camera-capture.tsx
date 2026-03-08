import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import Button from '../components/Button';
import ProgressBar from '../components/ProgressBar';
import Card from '../components/Card';

const PHOTO_STAGES = [
  { id: 1, title: 'Lesion Close-Up', icon: '📍', description: 'Focus on damaged areas' },
  { id: 2, title: 'Whole Plant', icon: '🌿', description: 'Capture entire plant' },
  { id: 3, title: 'Base & Soil', icon: '🪴', description: 'Show plant base and soil' },
];

interface CapturedPhoto {
  uri: string;
  stage: number;
}

export default function CameraCaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [currentStage, setCurrentStage] = useState(0);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');

  useEffect(() => {
    if (permission && !permission.granted) {
      requestPermission();
    }
  }, [permission]);

  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Card>
          <Text style={styles.permissionText}>
            Camera permission is required to capture plant images.
          </Text>
          <Button title="Grant Permission" onPress={requestPermission} variant="success" />
        </Card>
      </View>
    );
  }

  const currentPhotoStage = PHOTO_STAGES[currentStage];
  const currentPhoto = photos[currentStage];

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      });

      if (photo) {
        const newPhotos = [...photos];
        newPhotos[currentStage] = { uri: photo.uri, stage: currentStage + 1 };
        setPhotos(newPhotos);
        setShowPreview(true);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture. Please try again.');
    }
  };

  const retakePhoto = () => {
    const newPhotos = [...photos];
    newPhotos[currentStage] = undefined as any;
    setPhotos(newPhotos);
    setShowPreview(false);
  };

  const confirmPhoto = () => {
    setShowPreview(false);
    if (currentStage < PHOTO_STAGES.length - 1) {
      setCurrentStage(currentStage + 1);
    } else {
      // All photos captured, navigate to upload
      router.push({
        pathname: '/upload',
        params: {
          photos: JSON.stringify(photos.map(p => p.uri)),
        },
      });
    }
  };

  const goToPreviousStage = () => {
    if (currentStage > 0) {
      setCurrentStage(currentStage - 1);
      setShowPreview(false);
    }
  };

  if (showPreview && currentPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.progressContainer}>
          <ProgressBar current={currentStage + 1} total={PHOTO_STAGES.length} />
        </View>

        <Image source={{ uri: currentPhoto.uri }} style={styles.preview} />

        <Card style={styles.previewInfo}>
          <Text style={styles.previewTitle}>
            {currentPhotoStage.icon} {currentPhotoStage.title}
          </Text>
          <Text style={styles.previewDescription}>
            Photo {currentStage + 1} of {PHOTO_STAGES.length} captured
          </Text>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Retake"
            onPress={retakePhoto}
            variant="warning"
            style={styles.halfButton}
          />
          <Button
            title={currentStage === PHOTO_STAGES.length - 1 ? 'Done' : 'Next'}
            onPress={confirmPhoto}
            variant="success"
            style={styles.halfButton}
          />
        </View>

        {currentStage > 0 && (
          <TouchableOpacity onPress={goToPreviousStage}>
            <Text style={styles.backText}>← Go back to previous photo</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.progressContainer}>
        <ProgressBar current={currentStage + 1} total={PHOTO_STAGES.length} />
      </View>

      <Card style={styles.instructionCard}>
        <Text style={styles.instructionTitle}>
          {currentPhotoStage.icon} {currentPhotoStage.title}
        </Text>
        <Text style={styles.instructionDescription}>
          {currentPhotoStage.description}
        </Text>
        <Text style={styles.stageIndicator}>
          Photo {currentStage + 1} of {PHOTO_STAGES.length}
        </Text>
      </Card>

      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        />
        <View style={styles.overlay}>
          <View style={styles.frameBox} />
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.flipButton}
          onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
        >
          <Text style={styles.flipText}>🔄</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <View style={styles.placeholder} />
      </View>

      {currentStage > 0 && (
        <TouchableOpacity onPress={goToPreviousStage}>
          <Text style={styles.backText}>← Previous photo</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  permissionText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  progressContainer: {
    backgroundColor: '#fff',
    padding: 15,
  },
  instructionCard: {
    margin: 15,
    backgroundColor: '#fff',
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  instructionDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  stageIndicator: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  frameBox: {
    width: 280,
    height: 280,
    borderWidth: 3,
    borderColor: '#4CAF50',
    borderRadius: 10,
    backgroundColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#000',
  },
  flipButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipText: {
    fontSize: 32,
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4CAF50',
  },
  placeholder: {
    width: 50,
  },
  preview: {
    flex: 1,
    resizeMode: 'contain',
    backgroundColor: '#000',
  },
  previewInfo: {
    margin: 15,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  previewDescription: {
    fontSize: 14,
    color: '#666',
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
  },
  halfButton: {
    flex: 1,
  },
  backText: {
    color: '#2196F3',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 10,
  },
});
