import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../theme/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

/**
 * Modal camera with framing guide tuned to the capture target.
 * mode='person'  -> full-body silhouette guide
 * mode='garment' -> centered rectangle guide for items
 */
export default function CameraModal({ mode, onCapture, onClose }) {
  const cameraRef = useRef(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState(mode === 'person' ? 'front' : 'back');
  const [capturing, setCapturing] = useState(false);
  const flashAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!permission?.granted) requestPermission();
  }, [permission]);

  const flashWhite = () => {
    Animated.sequence([
      Animated.timing(flashAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(flashAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleShutter = async () => {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    flashWhite();

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: true,
        skipProcessing: false,
      });
      onCapture(photo);
    } catch (err) {
      console.error('Capture failed:', err);
      setCapturing(false);
    }
  };

  const flipCamera = () => {
    Haptics.selectionAsync();
    setFacing(prev => (prev === 'back' ? 'front' : 'back'));
  };

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera access</Text>
        <Text style={styles.permissionBody}>
          We need your camera to capture you and the items you want to try on.
        </Text>
        <Pressable
          style={styles.permissionButton}
          onPress={requestPermission}
        >
          <Text style={styles.permissionButtonText}>Allow camera</Text>
        </Pressable>
        <Pressable style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const guidance = mode === 'person'
    ? 'Stand facing forward, full body in frame'
    : 'Center the item, plain background works best';

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
      />

      {/* Framing guide overlay */}
      <View style={styles.overlay} pointerEvents="none">
        {mode === 'person' ? (
          <PersonGuide />
        ) : (
          <GarmentGuide />
        )}
      </View>

      {/* Flash animation layer */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: '#fff', opacity: flashAnim },
        ]}
      />

      {/* Top bar */}
      <SafeAreaView style={styles.topBar} pointerEvents="box-none">
        <Pressable style={styles.iconButton} onPress={onClose}>
          <Text style={styles.iconText}>✕</Text>
        </Pressable>
        <View style={styles.modeBadge}>
          <Text style={styles.modeText}>
            {mode === 'person' ? 'You' : 'Item'}
          </Text>
        </View>
        <Pressable style={styles.iconButton} onPress={flipCamera}>
          <Text style={styles.iconText}>⟲</Text>
        </Pressable>
      </SafeAreaView>

      {/* Guidance text */}
      <View style={styles.guidanceContainer} pointerEvents="none">
        <View style={styles.guidancePill}>
          <Text style={styles.guidanceText}>{guidance}</Text>
        </View>
      </View>

      {/* Shutter */}
      <SafeAreaView style={styles.bottomBar}>
        <Pressable
          onPress={handleShutter}
          disabled={capturing}
          style={({ pressed }) => [
            styles.shutterOuter,
            pressed && { transform: [{ scale: 0.92 }] },
          ]}
        >
          <View style={styles.shutterInner} />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

// Tall portrait outline — helps the user frame their full body
function PersonGuide() {
  return (
    <View style={styles.guideWrapper}>
      <View style={styles.personOutline} />
    </View>
  );
}

// Wide rectangle — for clothing items on a rack or laid flat
function GarmentGuide() {
  const cornerStyle = { borderColor: colors.bg };
  return (
    <View style={styles.guideWrapper}>
      <View style={styles.garmentBox}>
        <View style={[styles.corner, styles.cornerTL, cornerStyle]} />
        <View style={[styles.corner, styles.cornerTR, cornerStyle]} />
        <View style={[styles.corner, styles.cornerBL, cornerStyle]} />
        <View style={[styles.corner, styles.cornerBR, cornerStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  guideWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personOutline: {
    width: SCREEN_WIDTH * 0.55,
    height: SCREEN_HEIGHT * 0.7,
    borderRadius: SCREEN_WIDTH * 0.28,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.45)',
    borderStyle: 'dashed',
  },
  garmentBox: {
    width: SCREEN_WIDTH * 0.8,
    height: SCREEN_WIDTH * 0.95,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 3,
  },
  cornerTL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  cornerTR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  cornerBL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  cornerBR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '500',
  },
  modeBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  modeText: {
    ...typography.label,
    color: colors.textInverse,
  },
  guidanceContainer: {
    position: 'absolute',
    bottom: 180,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  guidancePill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  guidanceText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '500',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: spacing.lg,
  },
  shutterOuter: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.bg,
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  permissionTitle: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.md,
  },
  permissionBody: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
  },
  permissionButton: {
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  permissionButtonText: {
    ...typography.button,
    color: colors.textInverse,
  },
  closeButton: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    ...typography.button,
    color: colors.textSecondary,
  },
});
