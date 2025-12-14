import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/ThemeProvider';
import { AppCard } from '@/components/AppCard';
import { AppButton } from '@/components/AppButton';
import { listPrograms } from '@/services/programsApi';
import { Program, ProgramSession } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';

const ProgramsScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedProgramId, setExpandedProgramId] = useState<number | null>(null);
  const [launchingSession, setLaunchingSession] = useState<string | null>(null);
  const { createDraft, addExercise, addSet } = useWorkouts();

  const fetchPrograms = useCallback(async () => {
    try {
      setError(null);
      const data = await listPrograms();
      setPrograms(data);
    } catch (e: any) {
      setError(e?.message || 'Impossible de charger les programmes');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const parseReps = (value: string | number | null | undefined) => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const match = value.match(/(\d+)/);
      if (match && match[1]) {
        return Number(match[1]);
      }
    }
    return 10;
  };

  const handleStartSession = async (program: Program, sess: ProgramSession) => {
    if (!sess.sets?.length) {
      Alert.alert('Séance vide', 'Cette séance ne contient pas de séries.');
      return;
    }
    try {
      setLaunchingSession(`${program.id}-${sess.day_index}`);
      const draft = await createDraft(sess.title || `Séance ${sess.day_index + 1}`);
      if (!draft) {
        throw new Error('Impossible de créer la séance');
      }

      // Regrouper les sets par exercice
      const grouped = sess.sets.reduce<Record<string, typeof sess.sets>>((acc, set) => {
        const key = set.exercise_slug || 'exercice';
        acc[key] = acc[key] ? [...acc[key], set] : [set];
        return acc;
      }, {});

      for (const [slug, sets] of Object.entries(grouped)) {
        const exerciseId = await addExercise(draft.workout.id, slug, sets.length);
        if (!exerciseId) continue;
        for (const s of sets) {
          await addSet(exerciseId, {
            reps: parseReps(s.reps),
            weight: typeof s.weight === 'number' ? s.weight : null,
            rpe: typeof s.rpe === 'number' ? s.rpe : null,
          });
        }
      }

      router.push(`/track/${draft.workout.id}`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de démarrer la séance');
    } finally {
      setLaunchingSession(null);
    }
  };

  const toggleExpanded = (programId: number | undefined) => {
    if (programId === undefined) return;
    setExpandedProgramId(expandedProgramId === programId ? null : programId);
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Chargement des programmes...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="warning-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <AppButton title="Réessayer" onPress={fetchPrograms} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 16 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.accent}
        />
      }
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Mes Programmes</Text>
      </View>

      {programs.length === 0 ? (
        <AppCard style={styles.emptyCard}>
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="calendar-outline" size={48} color={theme.colors.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
              Aucun programme
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
              Crée ton premier programme personnalisé pour organiser tes séances
            </Text>
            <AppButton
              title="Créer un programme"
              onPress={() => router.push('/programme/create')}
              style={{ marginTop: 20 }}
            />
          </View>
        </AppCard>
      ) : (
        <>
          {programs.map((program) => {
            const isExpanded = expandedProgramId === program.id;
            return (
              <AppCard key={program.id} style={styles.programCard}>
                <Pressable onPress={() => toggleExpanded(program.id)} style={styles.programHeader}>
                  <View style={styles.programInfo}>
                    <View style={styles.programTitleRow}>
                      <Text style={[styles.programTitle, { color: theme.colors.textPrimary }]}>
                        {program.title}
                      </Text>
                      <View style={[styles.badge, { backgroundColor: theme.colors.accent + '20' }]}>
                        <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                          {program.sessions.length} séances
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.programMeta, { color: theme.colors.textSecondary }]}>
                      {program.objective || 'Général'} • {program.duration_weeks} semaine(s)
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>

                {isExpanded && (
                  <View style={styles.sessionsContainer}>
                    {program.sessions.map((sess) => {
                      const isLaunching = launchingSession === `${program.id}-${sess.day_index}`;
                      return (
                        <View
                          key={sess.day_index}
                          style={[
                            styles.sessionCard,
                            {
                              backgroundColor: theme.colors.surfaceMuted,
                              borderColor: theme.colors.border,
                            },
                          ]}
                        >
                          <View style={styles.sessionInfo}>
                            <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]}>
                              {sess.title}
                            </Text>
                            <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>
                              {sess.focus} • {sess.sets?.length || 0} exercices
                            </Text>
                            {sess.estimated_minutes && (
                              <Text style={[styles.sessionDuration, { color: theme.colors.textSecondary }]}>
                                ~{sess.estimated_minutes} min
                              </Text>
                            )}
                          </View>
                          <AppButton
                            title={isLaunching ? 'Ouverture...' : 'Démarrer'}
                            variant="secondary"
                            disabled={launchingSession !== null}
                            onPress={() => handleStartSession(program, sess)}
                            style={styles.startButton}
                          />
                        </View>
                      );
                    })}
                  </View>
                )}
              </AppCard>
            );
          })}

          <View style={styles.createButtonContainer}>
            <AppButton
              title="Créer un nouveau programme"
              onPress={() => router.push('/programme/create')}
              variant="ghost"
            />
          </View>
        </>
      )}
    </ScrollView>
  );
};

export default ProgramsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  emptyCard: {
    marginHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  programCard: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programInfo: {
    flex: 1,
  },
  programTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  programTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  programMeta: {
    fontSize: 14,
  },
  sessionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  sessionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionInfo: {
    flex: 1,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  sessionFocus: {
    fontSize: 13,
  },
  sessionDuration: {
    fontSize: 12,
    marginTop: 2,
  },
  startButton: {
    minWidth: 100,
  },
  createButtonContainer: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 24,
  },
});
