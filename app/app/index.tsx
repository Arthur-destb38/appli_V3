import { Link, useRouter } from 'expo-router';
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
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXERCISE_CATALOG } from '@/src/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useAuth } from '@/hooks/useAuth';
import { WorkoutStatus } from '@/types/workout';
import { formatDate } from '@/utils/formatting';
import { useAppTheme } from '@/theme/ThemeProvider';
import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';

export default function HomeScreen() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  const { workouts, isLoading, refresh, createDraft, deleteWorkout } = useWorkouts();
  const { theme } = useAppTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const handleCreate = async () => {
    const draft = await createDraft();
    if (draft) {
      router.push(`/create?id=${draft.workout.id}`);
    }
  };

  const stats = useMemo(() => {
    const total = workouts.length;
    const completed = workouts.filter((item) => item.workout.status === 'completed');
    const completedThisWeek = completed.filter((item) => {
      const diff = Date.now() - item.workout.updated_at;
      return diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const liftedThisWeek = workouts.reduce((sum, record) => {
      const isThisWeek = Date.now() - record.workout.updated_at <= 7 * 24 * 60 * 60 * 1000;
      if (!isThisWeek) {
        return sum;
      }
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
          if (!set) {
            return acc;
          }
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

    // Séances par semaine (4 dernières)
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    const weeks = [0, 1, 2, 3].map((idx) => {
      const start = now - (idx + 1) * weekMs;
      const end = now - idx * weekMs;
      const count = workouts.filter(
        (w) => w.workout.updated_at >= start && w.workout.updated_at < end
      ).length;
      return { label: `S-${idx}`, count };
    }).reverse();

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
      muscleVolume,
      weeks,
    };
  }, [workouts]);

  const nextWorkout = useMemo(
    () => workouts.find((item) => item.workout.status !== 'completed'),
    [workouts]
  );

  const recentWorkouts = useMemo(() => workouts.slice(0, 5), [workouts]);
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
    { label: 'Historique', route: '/history', type: 'nav' },
    { label: 'Paramètres', route: '/settings', type: 'nav' },
  ];
  const actionItems = [
    { label: 'Créer une séance', action: () => handleCreate() },
    { label: 'Créer un programme', action: () => router.push('/programs/create' as never) },
    {
      label: 'Ton coach sportif (bientôt)',
      action: () =>
        Alert.alert(
          'Ton coach sportif (bientôt)',
          [
            '• Questions à tout moment : technique, fréquence, récup, prévention des blessures.',
            "• Adaptations en direct : alternatives si fatigue ou manque de matériel (mêmes groupes, même objectif).",
            "• Suggestions alimentaires de base : idées de repas / macros selon ton objectif (perte, prise, maintien).",
            '• Plans courts : micro-cycles de 3-4 semaines avec progression charges/volume/RPE.',
            '• Suivi & feedback : analyse des séances pour équilibrer les muscles sollicités, proposer deloads.',
            "• Échauffement & mobilité ciblés : routines rapides selon la séance du jour et les articulations." ,
          ].join('\n')
        ),
    },
  ];
  const goTo = (route: string) => {
    closeMenu();
    router.push(route as never);
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 16 },
      ]}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refresh} />}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Résumé</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={openMenu}
            style={[
              styles.menuButton,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                shadowColor: theme.colors.border,
              },
            ]}
          >
            <View style={[styles.menuLine, { backgroundColor: theme.colors.textPrimary }]} />
            <View style={[styles.menuLine, { backgroundColor: theme.colors.textPrimary }]} />
            <View style={[styles.menuLine, { backgroundColor: theme.colors.textPrimary }]} />
          </Pressable>
        </View>
      </View>

      <AppCard>
        <View style={styles.progressHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Progression</Text>
          <Text style={[styles.progressLabel, { color: theme.colors.textSecondary }]}>
            {stats.completed}/{stats.total} séances
          </Text>
        </View>
        <View style={styles.progressRow}>
          <View style={styles.progressCircle}>
            <Text style={[styles.progressPercent, { color: theme.colors.textPrimary }]}>{stats.completionRate}%</Text>
            <Text style={[styles.progressCaption, { color: theme.colors.textSecondary }]}>complété</Text>
          </View>
          <View style={styles.progressDetails}>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${stats.completionRate}%`, backgroundColor: theme.colors.accent },
                ]}
              />
            </View>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Taux de complétion</Text>
            <View style={styles.progressChips}>
              <View style={[styles.progressChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>{stats.completedThisWeek}</Text>
                <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Cette semaine</Text>
              </View>
              <View style={[styles.progressChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>{stats.total}</Text>
                <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Total séances</Text>
              </View>
              <View style={[styles.progressChip, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.chipValue, { color: theme.colors.textPrimary }]}>
                  {Math.round(stats.liftedThisWeek)}
                </Text>
                <Text style={[styles.chipLabel, { color: theme.colors.textSecondary }]}>Kg soulevés</Text>
              </View>
            </View>
            {stats.total === 0 ? (
              <View style={[styles.infoBanner, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Text style={[styles.infoBannerText, { color: theme.colors.textSecondary }]}>
                  Commence par créer ta première séance pour voir des stats ici.
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Synthèse 7 jours</Text>
        <View style={styles.metricGrid}>
          <View style={[styles.metricBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{stats.volume7d}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Volume (kg·reps)</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{stats.sessions7d}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Séances</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>{stats.avgVolumeSession}</Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Volume / séance</Text>
          </View>
        </View>
        <View style={styles.metricGrid}>
          <View style={[styles.metricBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {Math.round(stats.volume7d - stats.prevVolume7d)}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Δ volume vs semaine -1</Text>
          </View>
          <View style={[styles.metricBox, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Text style={[styles.metricValue, { color: theme.colors.textPrimary }]}>
              {stats.sessions7d - stats.prevSessions7d}
            </Text>
            <Text style={[styles.metricLabel, { color: theme.colors.textSecondary }]}>Δ séances vs semaine -1</Text>
          </View>
        </View>
        <Text style={[styles.subSectionTitle, { color: theme.colors.textSecondary }]}>Régularité (4 sem.)</Text>
        <View style={styles.barRow}>
          {stats.weeks.map((week) => (
            <View key={week.label} style={styles.barItem}>
              <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.barFill,
                    {
                      height: Math.max(4, Math.min(100, week.count * 20)),
                      backgroundColor: theme.colors.accent,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.barLabel, { color: theme.colors.textSecondary }]}>{week.label}</Text>
            </View>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Muscles ciblés (7 jours)</Text>
        {Object.keys(stats.muscleVolume).length === 0 ? (
          <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>Pas assez de données.</Text>
        ) : (
          Object.entries(stats.muscleVolume)
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
                    {Math.round(volume)} kg·reps
                  </Text>
                </View>
              );
            })
        )}
      </AppCard>


      <AppCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Actions rapides</Text>
        <View style={styles.quickActions}>
          <AppButton
            title={nextWorkout ? 'Lancer la prochaine séance' : 'Créer une séance'}
            variant="primary"
            style={styles.quickActionButton}
            onPress={handleLaunchNext}
          />
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Réseau</Text>
        <View style={styles.networkRow}>
          <View style={styles.networkInfo}>
            <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>Découvre et duplique</Text>
            <Text style={[styles.bodyText, { color: theme.colors.textSecondary }]}>Accède aux séances partagées et reprends-les en un tap.</Text>
            <View style={styles.networkChips}>
              <View style={[styles.networkChip, { backgroundColor: theme.colors.surfaceMuted }]}
              >
                <Text style={[styles.networkChipText, { color: theme.colors.textPrimary }]}>Séances communautaires</Text>
              </View>
              <View style={[styles.networkChip, { backgroundColor: theme.colors.surfaceMuted }]}
              >
                <Text style={[styles.networkChipText, { color: theme.colors.textPrimary }]}>Duplication rapide</Text>
              </View>
            </View>
          </View>
          <AppButton title="Explorer le réseau" onPress={() => router.push('/feed')} />
        </View>
      </AppCard>

      <AppCard>
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Dernières séances</Text>
        {!recentWorkouts.length ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>Aucune séance</Text>
            <Text style={styles.emptySubtitle}>
              Crée ta première séance pour la retrouver ici.
            </Text>
            <Link href="/create" style={styles.link}>
              Créer une séance
            </Link>
          </View>
        ) : (
          recentWorkouts.map((item) => (
            <View
              key={item.workout.id}
              style={[
                styles.workoutCard,
                { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
              ]}
            >
              <View style={styles.workoutHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                    {item.workout.title || 'Séance sans nom'}
                  </Text>
                  <Text style={[styles.cardMeta, { color: theme.colors.textSecondary }]}>
                    {formatDate(item.workout.updated_at)} · {translateStatus(item.workout.status)}
                  </Text>
                </View>
                <View style={styles.statusPill}>
                  <Text style={[styles.statusText, { color: theme.colors.textPrimary }]}>
                    {item.workout.status === 'completed' ? 'Terminé' : 'Brouillon'}
                  </Text>
                </View>
              </View>
              <View style={styles.workoutActions}>
                <AppButton
                  title={item.workout.status === 'completed' ? 'Consulter' : 'Reprendre'}
                  variant="secondary"
                  style={styles.workoutActionBtn}
                  onPress={() => router.push(`/track/${item.workout.id}`)}
                />
                <TouchableOpacity onPress={() => deleteWorkout(item.workout.id)}>
                  <Text style={styles.deleteButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </AppCard>
      {menuOpen && (
        <Pressable style={styles.overlay} onPress={closeMenu}>
          <Animated.View
            style={[
              styles.drawer,
              drawerStyle,
              { backgroundColor: theme.colors.surface, shadowColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.drawerTitle, { color: theme.colors.textPrimary }]}>Navigation</Text>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.route} style={styles.drawerItem} onPress={() => goTo(item.route)}>
                <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.drawerSection}>
              <Text style={[styles.drawerSectionTitle, { color: theme.colors.textSecondary }]}>Actions</Text>
              {actionItems.map((item) => (
                <TouchableOpacity key={item.label} style={styles.drawerItem} onPress={() => { item.action(); closeMenu(); }}>
                  <Text style={[styles.drawerItemText, { color: theme.colors.textPrimary }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </Pressable>
      )}
    </ScrollView>
  );
}

const translateStatus = (status: WorkoutStatus) =>
  status === 'completed' ? 'terminée' : 'brouillon';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  link: {
    fontSize: 16,
    color: '#E11D48',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#CBD5F5',
    backgroundColor: '#F8FAFC',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  menuLine: {
    width: 18,
    height: 2,
    borderRadius: 999,
  },
  quickActions: {
    gap: 16,
    marginTop: 16,
  },
  createActions: {
    gap: 16,
    marginTop: 16,
  },
  quickActionButton: {
    borderWidth: 0,
    paddingVertical: 16,
  },
  bodyText: {
    fontSize: 15,
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#E11D48',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  emptyContainer: {
    marginTop: 120,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
    gap: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cardMeta: {
    fontSize: 14,
    color: '#6B7280',
  },
  deleteButton: {
    marginTop: 8,
  },
  deleteButtonText: {
    color: '#DC2626',
    fontWeight: '700',
  },
  workoutCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  workoutActions: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutActionBtn: {
    flex: 1,
    marginRight: 12,
  },
  metricGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  metricBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  metricLabel: {
    fontSize: 13,
    marginTop: 4,
  },
  subSectionTitle: {
    marginTop: 16,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  barRow: {
    flexDirection: 'row',
    gap: 12,
  },
  barItem: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: 18,
    borderRadius: 10,
    height: 100,
    justifyContent: 'flex-end',
  },
  barFill: {
    width: 18,
    borderRadius: 10,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 12,
  },
  muscleRow: {
    marginTop: 10,
  },
  muscleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  muscleBar: {
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 6,
  },
  muscleBarFill: {
    height: 10,
    borderRadius: 10,
  },
  muscleValue: {
    fontSize: 12,
    marginTop: 4,
  },
  infoBanner: {
    marginTop: 12,
    borderRadius: 12,
    padding: 10,
  },
  infoBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  networkRow: {
    gap: 12,
  },
  networkInfo: {
    gap: 6,
  },
  networkChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  networkChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  networkChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  drawer: {
    width: 260,
    height: '100%',
    paddingTop: 40,
    paddingHorizontal: 24,
    gap: 20,
    borderTopLeftRadius: 32,
    borderBottomLeftRadius: 32,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  drawerSection: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  drawerSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    marginBottom: 8,
    letterSpacing: 0.8,
  },
  drawerItem: {
    paddingVertical: 14,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#FDE0E4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressCaption: {
    fontSize: 11,
    textTransform: 'uppercase',
  },
  progressDetails: {
    flex: 1,
  },
  progressBar: {
    height: 10,
    borderRadius: 12,
    backgroundColor: '#F2F4F7',
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 12,
  },
  progressChips: {
    flexDirection: 'column',
    gap: 10,
    marginTop: 12,
  },
  progressChip: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  chipValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  chipLabel: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 15,
  },
  weekRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  weekStat: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  weekValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  weekLabel: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
});
