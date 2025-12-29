import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useWorkouts, pullFromServer } from '@/hooks/useWorkouts';
import { WorkoutCard } from '@/components/WorkoutCard';
import { AppCard } from '@/components/AppCard';

export default function CreatedWorkoutsScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { workouts, refresh, isLoading } = useWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Filtrer les séances créées (draft ou in_progress)
  const createdWorkouts = useMemo(() => {
    return workouts.filter(
      (item) => item.workout.status === 'draft' || item.workout.status === 'in_progress'
    );
  }, [workouts]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await pullFromServer();
      await refresh();
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return "Aujourd'hui";
    if (days === 1) return 'Hier';
    if (days < 7) return `Il y a ${days} jours`;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    }).format(date);
  };

  const WorkoutItem: React.FC<{ item: typeof workouts[0]; index: number }> = ({ item, index }) => {
    const slideAnim = useRef(new Animated.Value(50)).current;

    useEffect(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 50,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    }, []);

    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <WorkoutCard
          title={item.workout.title}
          date={formatDate(item.workout.updated_at)}
          status={item.workout.status as 'draft' | 'in_progress' | 'completed'}
          exerciseCount={item.exercises.length}
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            if (item.workout.status === 'in_progress') {
              router.push(`/track/${item.workout.id}` as never);
            } else {
              router.push(`/create?id=${item.workout.id}` as never);
            }
          }}
        />
      </Animated.View>
    );
  };

  const renderItem = useCallback(
    ({ item, index }: { item: typeof workouts[0]; index: number }) => (
      <WorkoutItem item={item} index={index} />
    ),
    [fadeAnim, router]
  );

  if (isLoading && !refreshing) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              router.back();
            }}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mes séances créées</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Chargement...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.back();
          }}
          style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mes séances créées</Text>
        <View style={{ width: 24 }} />
      </View>

      {createdWorkouts.length === 0 ? (
        <View style={styles.centered}>
          <Animated.View style={{ opacity: fadeAnim }}>
            <AppCard>
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={72} color={theme.colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                  Aucune séance créée
                </Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                  Crée une nouvelle séance pour commencer ton entraînement
                </Text>
              </View>
            </AppCard>
          </Animated.View>
        </View>
      ) : (
        <FlatList
          data={createdWorkouts}
          keyExtractor={(item) => `${item.workout.id}-${item.workout.client_id ?? 'local'}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

