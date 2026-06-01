import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import PhotoSlot from '../components/PhotoSlot';
import Button from '../components/Button';
import CameraModal from '../components/CameraModal';
import GeneratingView from '../components/GeneratingView';
import ResultView from '../components/ResultView';
import { colors, spacing, typography } from '../theme/tokens';
import { generateTryOn } from '../api/tryon';

// State machine: composer -> generating -> result -> composer
const VIEW = {
  COMPOSER: 'composer',
  GENERATING: 'generating',
  RESULT: 'result',
};

export default function HomeScreen() {
  const [personPhoto, setPersonPhoto] = useState(null);
  const [garmentPhoto, setGarmentPhoto] = useState(null);
  const [cameraMode, setCameraMode] = useState(null);
  const [view, setView] = useState(VIEW.COMPOSER);
  const [resultUri, setResultUri] = useState(null);

  const openCamera = (mode) => setCameraMode(mode);
  const closeCamera = () => setCameraMode(null);

  const handleCapture = (photo) => {
    if (cameraMode === 'person') setPersonPhoto(photo);
    if (cameraMode === 'garment') setGarmentPhoto(photo);
    closeCamera();
  };

  const handleGenerate = async () => {
    if (!personPhoto?.base64 || !garmentPhoto?.base64) return;
    setView(VIEW.GENERATING);
    try {
      const url = await generateTryOn(personPhoto.base64, garmentPhoto.base64);
      setResultUri(url);
      setView(VIEW.RESULT);
    } catch (err) {
      Alert.alert('Generation failed', err.message);
      setView(VIEW.COMPOSER);
    }
  };

  const handleReset = () => {
    setPersonPhoto(null);
    setGarmentPhoto(null);
    setResultUri(null);
    setView(VIEW.COMPOSER);
  };

  const bothPhotosReady = personPhoto && garmentPhoto;

  // ---- Generating ----
  if (view === VIEW.GENERATING) {
    return (
      <>
        <StatusBar style="dark" />
        <GeneratingView />
      </>
    );
  }

  // ---- Result ----
  if (view === VIEW.RESULT && resultUri) {
    return (
      <>
        <StatusBar style="dark" />
        <ResultView
          resultUri={resultUri}
          originalUri={personPhoto.uri}
          onReset={handleReset}
        />
      </>
    );
  }

  // ---- Composer (default) ----
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.label}>Try on</Text>
          <Text style={styles.title}>See it on you{'\n'}before you wear it.</Text>
        </View>

        <View style={styles.slotsRow}>
          <View style={styles.slotCol}>
            <PhotoSlot
              index="1"
              label="You"
              hint="Full body, plain background"
              photo={personPhoto}
              onPress={() => openCamera('person')}
            />
          </View>
          <View style={styles.slotCol}>
            <PhotoSlot
              index="2"
              label="The item"
              hint="On a hanger or laid flat"
              photo={garmentPhoto}
              onPress={() => openCamera('garment')}
            />
          </View>
        </View>

        <View style={styles.cta}>
          <Button
            label={bothPhotosReady ? 'Generate' : 'Add both photos'}
            onPress={handleGenerate}
            disabled={!bothPhotosReady}
          />
        </View>
      </ScrollView>

      <Modal
        visible={!!cameraMode}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeCamera}
      >
        <CameraModal
          mode={cameraMode}
          onCapture={handleCapture}
          onClose={closeCamera}
        />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xxl,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  slotsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  slotCol: {
    flex: 1,
  },
  cta: {
    marginTop: 'auto',
  },
});
