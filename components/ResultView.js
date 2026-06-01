import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Share,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, typography } from '../theme/tokens';
import Button from './Button';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Result reveal — fades the generated image in dramatically.
 * Toggle button shows the original "before" photo for comparison.
 * Primary CTA starts a new try-on. Secondary lets the user share.
 */
export default function ResultView({ resultUri, originalUri, onReset }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    // Success haptic on reveal
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        speed: 12,
        bounciness: 6,
      }),
    ]).start();
  }, []);

  const toggleCompare = () => {
    Haptics.selectionAsync();
    setShowOriginal(prev => !prev);
  };

  const handleShare = async () => {
    Haptics.selectionAsync();
    try {
      await Share.share({
        url: resultUri,
        message: 'Look I generated with my wardrobe app',
      });
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.label}>Result</Text>
        <Pressable
          onPress={toggleCompare}
          style={styles.compareToggle}
        >
          <Text style={styles.compareText}>
            {showOriginal ? 'Show result' : 'Show original'}
          </Text>
        </Pressable>
      </View>

      {/* Image stage */}
      <Animated.View
        style={[
          styles.stage,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <Image
          source={{ uri: showOriginal ? originalUri : resultUri }}
          style={styles.image}
          resizeMode="contain"
        />
        {showOriginal && (
          <View style={styles.originalBadge}>
            <Text style={styles.originalBadgeText}>Original</Text>
          </View>
        )}
      </Animated.View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button label="Share" variant="secondary" onPress={handleShare} />
        <View style={{ height: spacing.md }} />
        <Button label="Try another" variant="primary" onPress={onReset} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  compareToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.bgTertiary,
  },
  compareText: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '600',
  },
  stage: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    marginHorizontal: spacing.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  originalBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.scrim,
  },
  originalBadgeText: {
    ...typography.label,
    color: colors.textInverse,
  },
  actions: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },
});
