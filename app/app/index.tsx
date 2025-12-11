import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  Easing,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { EXERCISE_CATALOG } from '@/src/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { formatDate } from '@/utils/formatting';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AppCard } from '@/components/AppCard';
import { HeroSection } from '@/components/HeroSection';
import { QuickStatsRow } from '@/components/QuickStatsRow';
import { NextWorkoutCard } from '@/components/NextWorkoutCard';
import { WeekChart } from '@/components/WeekChart';
import { WorkoutCard } from '@/components/WorkoutCard';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { profile } = useUserProfile();
  const { workouts, isLoading, refresh, createDraft, deleteWorkout } = useWorkouts();
  const { theme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  // Calcul des statistiques
  const stats = useMemo(() => {
    if (!workouts.length) {
      return {
        total: 0,
        completed: 0,
        completionRate: 0,
        completedThisWeek: 0,
        liftedThisWeek: 0,
        volume7d: 0,
        sessions7d: 0,
        avgVolumeSession: 0,
        prevVolume7d: 0,
        prevSessions7d: 0,
        streak: 0,
        muscleVolume: {} as Record<string, number>,
        weekDays: [] as Array<{ day: string; value: number; isToday?: boolean }>,
      };
    }

    const total = workouts.length;
    const completed = workouts.filter((item) => item.workout.status === 'completed');
    const completedThisWeek = completed.filter((item) => {
      const diff = Date.now() - item.workout.updated_at;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;

    const liftedThisWeek = workouts.reduce((sum, record) => {
      const isThisWeek = Date.now() - record.workout.updated_at <= 7 * 24 * 60 * 60 * 1000;
      if (!isThisWeek) return sum;
      const sets = record.exercises.flatMap((exercise) => exercise.sets);
      const weeklyWeight = sets.reduce((setSum, set) => {
        if (set && typeof set.weight === 'number' && typeof set.reps === 'number') {
          return setSum + (set.weight ?? 0) * (set.reps ?? 0);
        }
        return setSum;
      }, 0);
      return sum + weeklyWeight;
    }, 0);

    const now = Date.now();
    const last7d = workouts.filter((w) => now - w.workout.updated_at <= 7 * 24 * 60 * 60 * 1000);
    const prev7d = workouts.filter(
      (w) =>
        now - w.workout.updated_at > 7 * 24 * 60 * 60 * 1000 &&
        now - w.workout.updated_at <= 14 * 24 * 60 * 60 * 1000
    );

    const calcVolume = (records: typeof workouts) =>
      records.reduce((sum, record) => {
        const sets = record.exercises.flatMap((ex) => ex.sets || []);
        const vol = sets.reduce((acc, set) => {
          if (!set) return acc;
          const weight = typeof set.weight === 'number' ? set.weight : 0;
          const reps = typeof set.reps === 'number' ? set.reps : 0;
          return acc + weight * reps;
        }, 0);
        return sum + vol;
      }, 0);

    const volume7d = calcVolume(last7d);
    const prevVolume7d = calcVolume(prev7d);
    const sessions7d = last7d.length;
    const prevSessions7d = prev7d.length;
    const avgVolumeSession = sessions7d ? Math.round(volume7d / sessions7d) : 0;

    // Streak calculation (jours consécutifs avec au moins une séance)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dayStart = checkDate.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const hasWorkout = workouts.some(
        (w) => w.workout.updated_at >= dayStart && w.workout.updated_at < dayEnd
      );
      
      if (hasWorkout) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }

    // Répartition musculaire 7j
    const muscleVolume: Record<string, number> = {};
    const catalogMap = new Map(EXERCISE_CATALOG.map((ex) => [ex.id, ex]));
    last7d.forEach((record) => {
      record.exercises.forEach((ex) => {
        const meta = catalogMap.get(ex.exercise_id);
        const muscle = meta?.muscleGroupFr ?? meta?.muscleGroup ?? 'Autre';
        const vol = (ex.sets || []).reduce((acc, set) => {
          if (!set) return acc;
          const weight = typeof set.weight === 'number' ? set.weight : 0;
          const reps = typeof set.reps === 'number' ? set.reps : 0;
          return acc + weight * reps;
        }, 0);
        muscleVolume[muscle] = (muscleVolume[muscle] || 0) + vol;
      });
    });

    // Données par jour de la semaine (7 derniers jours)
    const dayNames = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    const todayIndex = new Date().getDay();
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      const dayStart = date.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      
      const dayVolume = workouts
        .filter((w) => w.workout.updated_at >= dayStart && w.workout.updated_at < dayEnd)
        .reduce((sum, record) => {
          const sets = record.exercises.flatMap((ex) => ex.sets || []);
          return sum + sets.reduce((acc, set) => {
            if (!set) return acc;
            const weight = typeof set.weight === 'number' ? set.weight : 0;
            const reps = typeof set.reps === 'number' ? set.reps : 0;
            return acc + weight * reps;
          }, 0);
        }, 0);

      return {
        day: dayNames[date.getDay()],
        value: dayVolume,
        isToday: i === 6,
      };
    });

    return {
      total,
      completed: completed.length,
      completionRate: total ? Math.round((completed.length / total) * 100) : 0,
      completedThisWeek,
      liftedThisWeek,
      volume7d,
      sessions7d,
      avgVolumeSession,
      prevVolume7d,
      prevSessions7d,
      streak,
      muscleVolume,
      weekDays,
    };
  }, [workouts]);

  // Prochaine séance (brouillon en cours)
  const nextWorkout = useMemo(
    () => workouts.find((item) => item.workout.status !== 'completed'),
    [workouts]
  );

  // 5 dernières séances
  const recentWorkouts = useMemo(() => workouts.slice(0, 5), [workouts]);

  // Quick stats pour les chips
  const quickStats = useMemo(() => {
    const volumeChange = stats.prevVolume7d > 0
      ? Math.round(((stats.volume7d - stats.prevVolume7d) / stats.prevVolume7d) * 100)
      : 0;
    const sessionsChange = stats.sessions7d - stats.prevSessions7d;

    return [
      {
        id: 'sessions',
        value: `${stats.completedThisWeek}/3`,
        label: 'Objectif',
        icon: 'checkmark-circle' as const,
        trend: stats.completedThisWeek >= 3 ? 'up' : 'neutral' as const,
        color: '#10B981',
      },
      {
        id: 'volume',
        value: stats.volume7d > 1000 ? `${(stats.volume7d / 1000).toFixed(1)}k` : stats.volume7d,
        label: 'Volume (kg)',
        icon: 'barbell' as const,
        trend: volumeChange > 0 ? 'up' : volumeChange < 0 ? 'down' : 'neutral' as const,
        trendValue: volumeChange !== 0 ? `${volumeChange > 0 ? '+' : ''}${volumeChange}%` : undefined,
        color: '#667eea',
      },
      {
        id: 'streak',
        value: stats.streak,
        label: 'Streak 🔥',
        icon: 'flame' as const,
        trend: stats.streak >= 7 ? 'up' : 'neutral' as const,
        color: '#f59e0b',
      },
      {
        id: 'total',
        value: stats.total,
        label: 'Séances totales',
        icon: 'fitness' as const,
        color: '#8b5cf6',
      },
    ];
  }, [stats]);

  const handleCreate = async () => {
    const draft = await createDraft();
    if (draft) {
      router.push(`/create?id=${draft.workout.id}`);
    }
  };

  const handleLaunchNext = async () => {
    if (nextWorkout) {
      router.push(`/track/${nextWorkout.workout.id}`);
    } else {
      await handleCreate();
    }
  };

  const openMenu = () => {
    setMenuOpen(true);
    Animated.timing(drawerAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };

  const closeMenu = () => {
    Animated.timing(drawerAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => setMenuOpen(false));
  };

  const drawerStyle = {
    transform: [
      {
        translateX: drawerAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [280, 0],
        }),
      },
    ],
  };

  const menuItems = [
    { label: 'Historique', route: '/history', icon: 'time-outline' as const },
    { label: 'Programmes', route: '/programs', icon: 'calendar-outline' as const },
    { label: 'Paramètres', route: '/settings', icon: 'settings-outline' as const },
  ];

  const actionItems = [
    { label: 'Créer une séance', action: () => handleCreate(), icon: 'add-circle-outline' as const },
    { label: 'Créer un programme', action: () => router.push('/programs/create' as never), icon: 'clipboard-outline' as const },
  ];

  const goTo = (route: string) => {
    closeMenu();
    router.push(route as never);
  };

  const username = profile?.username || 'Champion';
  const volumeTrend = stats.prevVolume7d > 0
    ? {
        direction: stats.volume7d > stats.prevVolume7d ? 'up' : stats.volume7d < stats.prevVolume7d ? 'down' : 'neutral' as const,
        value: `${stats.volume7d > stats.prevVolume7d ? '+' : ''}${Math.round(((stats.volume7d - stats.prevVolume7d) / stats.prevVolume7d) * 100)}%`,
      }
    : undefined;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section avec greeting et streak */}
        <View style={{ paddingTop: insets.top }}>
          <HeroSection
            username={username}
            streak={stats.streak}
            nextWorkoutTitle={nextWorkout?.workout.title}
            onStartWorkout={handleLaunchNext}
            onOpenMenu={openMenu}
          />
        </View>

        {/* Quick Stats Row */}
        <QuickStatsRow stats={quickStats} />

        {/* Prochaine séance (si existe) */}
        {nextWorkout && (
          <NextWorkoutCard
            title={nextWorkout.workout.title}
            exercises={nextWorkout.exercises.map((e) => {
              const catalog = EXERCISE_CATALOG.find((c) => c.id === e.exercise_id);
              return {
                name: catalog?.name || e.exercise_id,
                muscle_group: catalog?.muscleGroup,
              };
            })}
            setsCount={nextWorkout.exercises.reduce((sum, e) => sum + (e.sets?.length || 0), 0)}
            estimatedDuration={Math.max(20, nextWorkout.exercises.length * 10)}
            onStart={() => router.push(`/track/${nextWorkout.workout.id}`)}
            onEdit={() => router.push(`/create?id=${nextWorkout.workout.id}`)}
          />
        )}

        {/* Graphique de la semaine */}
        <WeekChart
          data={stats.weekDays}
          title="Cette semaine"
          unit="kg"
          totalValue={stats.volume7d}
          trend={volumeTrend}
        />

        {/* Muscles ciblés */}
        {Object.keys(stats.muscleVolume).length > 0 && (
          <AppCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="body-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Muscles ciblés
              </Text>
            </View>
            {Object.entries(stats.muscleVolume)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([muscle, volume]) => {
                const maxVolume = Math.max(...Object.values(stats.muscleVolume));
                const width = maxVolume ? Math.max(12, (volume / maxVolume) * 100) : 12;
                return (
                  <View key={muscle} style={styles.muscleRow}>
                    <Text style={[styles.muscleLabel, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                      {muscle}
                    </Text>
                    <View style={[styles.muscleBar, { backgroundColor: theme.colors.surfaceMuted }]}>
                      <View
                        style={[
                          styles.muscleBarFill,
                          { width: `${width}%`, backgroundColor: theme.colors.accent },
                        ]}
                      />
                    </View>
                    <Text style={[styles.muscleValue, { color: theme.colors.textSecondary }]}>
                      {Math.round(volume)} kg
                    </Text>
                  </View>
                );
              })}
          </AppCard>
        )}

        {/* Réseau */}
        <AppCard style={{ marginHorizontal: 16, marginBottom: 16 }}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="people-outline" size={18} color={theme.colors.accent} />
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              Réseau
            </Text>
          </View>
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>
            Découvre les séances de la communauté et partage les tiennes !
          </Text>
          <TouchableOpacity
            style={[styles.networkButton, { backgroundColor: theme.colors.accent }]}
            onPress={() => router.push('/feed')}
          >
            <Ionicons name="globe-outline" size={18} color="#fff" />
            <Text style={styles.networkButtonText}>Explorer le réseau</Text>
          </TouchableOpacity>
        </AppCard>

        {/* Dernières séances */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="time-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                Dernières séances
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/history')}>
              <Text style={[styles.seeAllLink, { color: theme.colors.accent }]}>
                Voir tout
              </Text>
            </TouchableOpacity>
          </View>

          {!recentWorkouts.length ? (
            <View style={[styles.emptyState, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={styles.emptyIcon}>🏋️</Text>
              </View>
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Aucune séance
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Crée ta première séance pour la retrouver ici
              </Text>
              <TouchableOpacity
                style={[styles.emptyButton, { backgroundColor: theme.colors.accent }]}
                onPress={handleCreate}
              >
                <Text style={styles.emptyButtonText}>Créer une séance</Text>
              </TouchableOpacity>
            </View>
          ) : (
            recentWorkouts.map((item) => (
              <WorkoutCard
                key={item.workout.id}
                title={item.workout.title}
                date={formatDate(item.workout.updated_at)}
                status={item.workout.status as 'draft' | 'completed' | 'in_progress'}
                exerciseCount={item.exercises?.length}
                onPress={() => router.push(`/track/${item.workout.id}`)}
                onDelete={() => deleteWorkout(item.workout.id)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* Drawer Menu */}
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.drawer,
              drawerStyle,
              { backgroundColor: theme.colors.surface, shadowColor: theme.colors.border },
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Menu</Text>
              <TouchableOpacity onPress={closeMenu}>
                <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.drawerSection}>
              <Text style={[styles.drawerSectionTitle, { color: theme.colors.textSecondary }]}>
                Navigation
              </Text>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.drawerItem}
                  onPress={() => goTo(item.route)}
                >
                  <Ionicons name={item.icon} size={20} color={theme.colors.textPrimary} />
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.drawerSection}>
              <Text style={[styles.drawerSectionTitle, { color: theme.colors.textSecondary }]}>
                Actions
              </Text>
              {actionItems.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.drawerItem}
                  onPress={() => {
                    item.action();
                    closeMenu();
                  }}
                >
                  <Ionicons name={item.icon} size={20} color={theme.colors.accent} />
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '600',
  },
  bodyText: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  networkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  networkButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  muscleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 12,
  },
  muscleLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 80,
  },
  muscleBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  muscleValue: {
    fontSize: 12,
    width: 60,
    textAlign: 'right',
  },
  emptyState: {
    padding: 32,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 12,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyIcon: {
    fontSize: 28,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawer: {
    width: 280,
    height: '100%',
    paddingTop: 60,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderBottomLeftRadius: 24,
    shadowOpacity: 0.25,
    shadowOffset: { width: -4, height: 0 },
    shadowRadius: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  drawerSection: {
    marginBottom: 28,
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
