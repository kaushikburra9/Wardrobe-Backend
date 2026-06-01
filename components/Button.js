import React, { useRef } from 'react';
import { Pressable, Text, ActivityIndicator, Animated, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, spacing, typography, motion } from '../theme/tokens';

/**
 * Primary action button.
 * Animates scale on press, fires haptic feedback, shows loading state.
 */
export default function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  fullWidth = true,
  style,
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress?.();
  };

  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Animated.View style={[
      { transform: [{ scale }] },
      fullWidth && { width: '100%' },
      style,
    ]}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={isDisabled}
        style={[
          styles.base,
          isPrimary ? styles.primary : styles.secondary,
          isDisabled && styles.disabled,
        ]}
      >
        {loading ? (
          <ActivityIndicator
            color={isPrimary ? colors.textInverse : colors.text}
            size="small"
          />
        ) : (
          <Text style={[
            typography.button,
            isPrimary ? styles.primaryText : styles.secondaryText,
          ]}>
            {label}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.bgTertiary,
  },
  primaryText: {
    color: colors.textInverse,
  },
  secondaryText: {
    color: colors.text,
  },
  disabled: {
    opacity: 0.4,
  },
});
