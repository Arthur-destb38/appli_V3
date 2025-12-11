import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface StatChip {
  id: string;
  value: string | number;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: string;
}

interface QuickStatsRowProps {
  stats: StatChip[];
}

const StatChipItem: React.FC<{ stat: StatChip; index: number }> = ({ stat, index }) => {
  const { theme } = useAppTheme();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        delay: index * 80,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
    ]).start();
  }, [index]);

  const getTrendColor = () => {
    if (stat.trend === 'up') return '#10B981';
    if (stat.trend === 'down') return '#EF4444';
    return theme.colors.textSecondary;
  };

  const getTrendIcon = () => {
    if (stat.trend === 'up') return 'trending-up';
    if (stat.trend === 'down') return 'trending-down';
    return 'remove';
  };

  const chipColor = stat.color || theme.colors.accent;

  return (
    <Animated.View
      style={[
        styles.chip,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: slideAnim,
          transform: [
            { scale: scaleAnim },
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [30, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${chipColor}20` }]}>
        <Ionicons name={stat.icon} size={18} color={chipColor} />
      </View>
      <View style={styles.chipContent}>
        <View style={styles.valueRow}>
          <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>
            {stat.value}
          </Text>
          {stat.trend && stat.trendValue && (
            <View style={[styles.trendBadge, { backgroundColor: `${getTrendColor()}15` }]}>
              <Ionicons name={getTrendIcon()} size={10} color={getTrendColor()} />
              <Text style={[styles.trendText, { color: getTrendColor() }]}>
                {stat.trendValue}
              </Text>
            </View>
          )}
        </View>
        <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>
          {stat.label}
        </Text>
      </View>
    </Animated.View>
  );
};

export const QuickStatsRow: React.FC<QuickStatsRowProps> = ({ stats }) => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {stats.map((stat, index) => (
        <StatChipItem key={stat.id} stat={stat} index={index} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    minWidth: 130,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    flex: 1,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  chipLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  trendText: {
    fontSize: 10,
    fontWeight: '700',
  },
});

