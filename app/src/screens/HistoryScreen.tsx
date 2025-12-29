import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Animated,
  Easing,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useNavigation } from 'expo-router';

import { fetchWorkouts, WorkoutWithRelations } from '@/db/workouts-repository';
import { useAppTheme } from '@/theme/ThemeProvider';

type HistoryItem = {
  id: number;
  client_id?: string | null;
  title: string;
  date: number;
  dateLabel: string;
  status: string;
  exerciseCount: number;
  setCount: number;
  volume: number;
  synced: boolean;
  exercises: string[];
};

type PeriodFilter = 'all' | 'month' | 'week';

const formatDate = (timestamp: number) => {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(timestamp));
};

const computeVolume = (workout: WorkoutWithRelations) => {
  return workout.sets.reduce((acc, set) => {
    const weight = set.weight ?? 0;
    return acc + weight * set.reps;
  }, 0);
};

const mapToHistoryItem = (workout: WorkoutWithRelations): HistoryItem => {
  return {
    id: workout.workout.id,
    client_id: workout.workout.client_id,
    title: workout.workout.title,
    date: workout.workout.updated_at,
    dateLabel: formatDate(workout.workout.updated_at),
    status: workout.workout.status,
    exerciseCount: workout.exercises.length,
    setCount: workout.sets.length,
    volume: computeVolume(workout),
    synced: Boolean(workout.workout.server_id),
    exercises: workout.exercises.map((exercise) => exercise.exercise_id.toString()),
  };
};

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HistoryItem[]>([]);
  const [filtered, setFiltered] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [period] = useState<PeriodFilter>('all');
  const [exerciseQuery] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const workouts = await fetchWorkouts();
      const items = workouts.map(mapToHistoryItem);
      setData(items);
      setFiltered(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => (
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.border,
          },
        ]}
        onPress={() => navigation.navigate('history/[id]' as never, { id: item.id } as never)}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>{item.dateLabel}</Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor:
                  item.status === 'completed' ? theme.colors.primaryMuted : theme.colors.surfaceMuted,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.colors.textPrimary }]}>
              {item.status === 'completed' ? 'Terminée' : 'Brouillon'}
            </Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{item.exerciseCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Exos</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{item.setCount}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Séries</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>{Math.round(item.volume)}</Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>kg</Text>
          </View>
        </View>
        {item.synced ? (
          <Text style={[styles.synced, { color: theme.colors.accent }]}>Synchronisée</Text>
        ) : null}
      </TouchableOpacity>
    ),
    [navigation, theme.colors.surface, theme.colors.border, theme.colors.surfaceMuted, theme.colors.textPrimary, theme.colors.textSecondary, theme.colors.accent]
  );

  useEffect(() => {
    const now = Date.now();
    const exerciseFilter = exerciseQuery.trim().toLowerCase();

    const filteredItems = data.filter((item) => {
      let matchesPeriod = true;
      if (period === 'week') {
        const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
        matchesPeriod = item.date >= oneWeekAgo;
      } else if (period === 'month') {
        const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;
        matchesPeriod = item.date >= oneMonthAgo;
      }

      if (!matchesPeriod) {
        return false;
      }

      if (!exerciseFilter) {
        return true;
      }

      return item.exercises.some((exerciseId) =>
        exerciseId.toLowerCase().includes(exerciseFilter)
      );
    });

    setFiltered(filteredItems);
  }, [data, period, exerciseQuery]);

  const content = useMemo(() => {
    if (isLoading) {
      return (
        <View style={styles.centered}>
          <Text>Chargement en cours…</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
          <TouchableOpacity onPress={load} style={styles.retryButton}>
            <Text style={styles.retryText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!filtered.length) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>Aucune séance encore</Text>
          <Text style={styles.emptySubtitle}>Crée une séance pour voir ton historique apparaître ici.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.client_id ?? 'local'}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, { paddingTop: 64 }]}
      />
    );
  }, [error, filtered, isLoading, onRefresh, renderItem, refreshing, load]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top + 12 }] }>
      <View style={[styles.screenHeader, { backgroundColor: theme.colors.surface }]}> 
        <Text style={[styles.screenTitle, { color: theme.colors.textPrimary }]}>Historique</Text>
        <Text style={[styles.screenSubtitle, { color: theme.colors.textSecondary }]}> 
          Surveille tes dernières séances
        </Text>
      </View>
      {content}
    </View>
  );
};

export default HistoryScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  screenHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  screenSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  meta: {
    fontSize: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  synced: {
    fontSize: 12,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  error: {
    fontWeight: '600',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  retryText: {
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  statPill: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
});
