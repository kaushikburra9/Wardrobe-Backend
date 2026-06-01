import React, { useRef } from 'react';
import { Pressable, View, Image, Text, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography } from '../theme/tokens';

/**
 * Photo slot — empty state shows icon + label, filled state shows thumbnail.
 * Tapping a filled slot lets the user retake.
 */
export default function PhotoSlot({
  label,
  hint,
  photo,
  onPress,
  index,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 0,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        style={[
          styles.slot,
          photo ? styles.slotFilled : styles.slotEmpty,
        ]}
      >
        {photo ? (
          <>
            <Image source={{ uri: photo.uri }} style={styles.thumb} />
            <View style={styles.retakeOverlay}>
              <Text style={styles.retakeText}>Tap to retake</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.indexBadge}>
              <Text style={styles.indexText}>{index}</Text>
            </View>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.hint}>{hint}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  slot: {
    aspectRatio: 3 / 4,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: colors.bgSecondary,
  },
  slotEmpty: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  slotFilled: {
    borderWidth: 0,
  },
  thumb: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  retakeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: spacing.sm,
    backgroundColor: colors.scrim,
    alignItems: 'center',
  },
  retakeText: {
    ...typography.caption,
    color: colors.textInverse,
    fontWeight: '500',
  },
  indexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  indexText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  label: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
});
