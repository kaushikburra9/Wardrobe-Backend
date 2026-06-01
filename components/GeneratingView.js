import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, typography, radius } from '../theme/tokens';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STATUS_STEPS = [
  'Analyzing your photo',
  'Reading the garment',
  'Mapping fit and drape',
  'Rendering the final look',
];

/**
 * Shown during the 5-17 second Fashn generation.
 * Indeterminate progress bar + rotating status text + subtle pulsing brand mark.
 */
export default function GeneratingView() {
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.5)).current;
  const [statusIndex, setStatusIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Indeterminate progress — eases up to 90% over 14s, never completes on its own
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 0.9,
      duration: 14000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, []);

  // Pulsing dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.5,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Rotate status text every 3s with fade
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        setStatusIndex(prev => (prev + 1) % STATUS_STEPS.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.dot,
            { opacity: pulseAnim, transform: [{ scale: pulseAnim }] },
          ]}
        />

        <Text style={styles.label}>Generating</Text>

        <Animated.Text style={[styles.status, { opacity: fadeAnim }]}>
          {STATUS_STEPS[statusIndex]}
        </Animated.Text>

        <View style={styles.progressTrack}>
          <Animated.View
            style={[styles.progressFill, { width: progressWidth }]}
          />
        </View>

        <Text style={styles.timeHint}>This usually takes 5–15 seconds</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  status: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    minHeight: 40,
  },
  progressTrack: {
    width: SCREEN_WIDTH - spacing.xl * 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.bgTertiary,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  timeHint: {
    ...typography.caption,
    color: colors.textTertiary,
  },
});
