import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Alert,
  Animated,
  Easing,
} from 'react-native';

import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutExercise, WorkoutSet } from '@/types/workout';
import { useAppTheme } from '@/theme/ThemeProvider';

interface Props {
  workoutId: number;
  modeSport?: boolean;
}

const DEFAULT_SET: { reps: number; weight: number | null; rpe: number | null } = {
  reps: 10,
  weight: null,
  rpe: 6,
};

export const TrackWorkoutScreen: React.FC<Props> = ({ workoutId, modeSport = false }) => {
  const router = useRouter();
  const { theme } = useAppTheme();
  const {
    findWorkout,
    addSet,
    updateSet,
    removeSet,
    completeWorkout,
    pendingMutations,
  } = useWorkouts();
  const workout = useMemo(() => findWorkout(workoutId), [findWorkout, workoutId]);
  const [restSeconds, setRestSeconds] = useState(90);
  const [timerRunning, setTimerRunning] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const intervalRef = useRef<NodeJS.Timer | null>(null);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  if (!workout) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>Séance introuvable</Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
          Revenez à l'accueil pour créer ou sélectionner une séance.
        </Text>
      </View>
    );
  }

  const handleAddSet = async (exercise: WorkoutExercise) => {
    await addSet(exercise.id, DEFAULT_SET);
  };

  const handleRepeatLast = async (exercise: WorkoutExercise) => {
    const lastSet = workout.sets
      .filter((item) => item.workout_exercise_id === exercise.id)
      .slice(-1)[0];
    await addSet(exercise.id, {
      reps: lastSet?.reps ?? DEFAULT_SET.reps,
      weight: lastSet?.weight ?? DEFAULT_SET.weight,
      rpe: lastSet?.rpe ?? DEFAULT_SET.rpe,
    });
  };

  const handleAdjustSet = (set: WorkoutSet, field: 'reps' | 'weight' | 'rpe', delta: number) => {
    const current = Number(set[field] ?? 0);
    let next: number;
    if (field === 'weight') {
      next = Math.max(0, Math.round((current + delta) * 10) / 10);
    } else if (field === 'rpe') {
      next = Math.min(10, Math.max(0, Math.round((current + delta) * 2) / 2));
    } else {
      next = Math.max(0, Math.round(current + delta));
    }

    updateSet(set.id, {
      [field]: next,
    });
  };

  const handleToggleCompletion = async (set: WorkoutSet) => {
    const isDone = Boolean(set.done_at);
    await updateSet(set.id, { done_at: isDone ? null : Date.now() });
    if (!isDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    }
  };

  const handleRemoveSet = async (setId: number) => {
    await removeSet(setId);
  };

  const hasPendingMutations = pendingMutations > 0;

  const openVideo = (exerciseSlug: string) => {
    const query = exerciseSlug.replace(/-/g, ' ');
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + ' exercise')}`;
    Linking.openURL(url).catch(() => Alert.alert('Impossible d’ouvrir la vidéo'));
  };

  const startRestTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setRemaining(restSeconds);
    setTimerRunning(true);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current as NodeJS.Timer);
          intervalRef.current = null;
          setTimerRunning(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timerRunning) {
      spinAnim.setValue(0);
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [timerRunning, spinAnim]);

  useEffect(() => {
    const ratio = restSeconds > 0 ? remaining / restSeconds : 0;
    Animated.timing(progressAnim, {
      toValue: ratio,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [remaining, restSeconds, progressAnim]);

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      contentContainerStyle={[styles.container, { paddingTop: 12 }]}
      data={workout.exercises}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <View style={[styles.header, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{workout.workout.title}</Text>
            {modeSport ? (
              <View style={[styles.modeBadge, { backgroundColor: theme.colors.accentMuted }]}>
                <Text style={[styles.modeBadgeText, { color: theme.colors.accent }]}>Mode sport</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}> 
            {workout.exercises.length} exercice(s) · {workout.sets.length} série(s)
          </Text>
          {modeSport ? (
            <Text style={[styles.restTip, { color: theme.colors.textSecondary }]}>
              Repos suggéré : 60-90s entre les séries. Appui long pour valider chaque série.
            </Text>
          ) : null}
          <View style={styles.restRow}>
            <Text style={[styles.restLabel, { color: theme.colors.textSecondary }]}>Chrono repos</Text>
            <View style={styles.restControls}>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setRestSeconds((s) => Math.max(30, s - 10))}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>-</Text>
              </TouchableOpacity>
              <Text style={[styles.restValue, { color: theme.colors.textPrimary }]}>
                {restSeconds}s
              </Text>
              <TouchableOpacity
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setRestSeconds((s) => Math.min(300, s + 10))}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>+</Text>
              </TouchableOpacity>

              <Pressable style={styles.restRing} onPress={startRestTimer}>
                <Animated.View
                  style={[
                    styles.restRingInner,
                    {
                      borderColor: theme.colors.accent,
                      transform: [
                        {
                          rotate: spinAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '360deg'],
                          }),
                        },
                      ],
                      opacity: timerRunning ? 1 : 0.4,
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.restRingInner,
                    styles.restRingProgress,
                    {
                      borderColor: theme.colors.accent,
                      transform: [
                        { scaleX: progressAnim },
                        { scaleY: progressAnim },
                      ],
                      opacity: timerRunning ? 1 : 0.3,
                    },
                  ]}
                />
                <View style={[styles.restRingContent, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <Text style={[styles.restButtonText, { color: theme.colors.textPrimary }]}>
                    {timerRunning ? `${remaining}s` : 'Go'}
                  </Text>
                </View>
              </Pressable>
            </View>
          </View>
          {hasPendingMutations ? (
            <View style={[styles.queueBadge, { backgroundColor: theme.colors.warning + '20' }]}>
              <Text style={[styles.queueBadgeText, { color: theme.colors.warning }]}> 
                {pendingMutations} action(s) en attente
              </Text>
            </View>
          ) : null}
        </View>
      }
      ListEmptyComponent={
        <View style={[styles.emptyExercises, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.emptyExercisesTitle, { color: theme.colors.textPrimary }]}>Aucun exercice</Text>
          <Text style={[styles.emptyExercisesSubtitle, { color: theme.colors.textSecondary }]}>
            Ajoute des exercices depuis l'écran de création pour commencer le suivi.
          </Text>
        </View>
      }
      ListFooterComponent={
        workout.exercises.length ? (
          <TouchableOpacity
            style={[styles.completeButton, { backgroundColor: theme.colors.success, borderColor: theme.colors.border }]}
            onPress={async () => {
              await completeWorkout(workout.workout.id);
              router.push('/');
            }}>
            <Text style={[styles.completeText, { color: theme.colors.onPrimary }]}>Terminer la séance</Text>
          </TouchableOpacity>
        ) : null
      }
      renderItem={({ item }) => {
        const exerciseSets = workout.sets.filter((set) => set.workout_exercise_id === item.id);
        return (
          <View style={[styles.exerciseCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.exerciseHeader}>
                <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>{item.exercise_id}</Text>
                <View style={styles.exerciseActions}>
                  <TouchableOpacity 
                    onPress={() => openVideo(item.exercise_id)} 
                    style={[styles.linkButton, { backgroundColor: theme.colors.surfaceMuted }]}
                  >
                    <Text style={[styles.linkButtonText, { color: theme.colors.accent }]}>Vidéo</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleAddSet(item)} 
                    style={[styles.linkButton, { backgroundColor: theme.colors.accent }]}
                  >
                    <Text style={[styles.linkButtonText, { color: '#FFFFFF' }]}>+ Série</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleRepeatLast(item)} 
                    style={[styles.linkButton, { backgroundColor: theme.colors.surfaceMuted }]}
                  >
                    <Text style={[styles.linkButtonText, { color: theme.colors.textPrimary }]}>Répéter</Text>
                  </TouchableOpacity>
                </View>
              </View>
            {exerciseSets.length === 0 ? (
              <Text style={[styles.emptySetsHint, { color: theme.colors.textSecondary }]}>
                Ajoute ta première série pour cet exercice.
              </Text>
            ) : null}
            {exerciseSets.map((set, index) => (
              <Pressable
                key={set.id}
                onLongPress={() => handleToggleCompletion(set)}
                style={[
                  styles.setRow,
                  {
                    backgroundColor: set.done_at ? theme.colors.success + '15' : theme.colors.surfaceMuted,
                    borderColor: set.done_at ? theme.colors.success + '40' : theme.colors.border,
                  },
                ]}>
              <View style={styles.setHeader}>
                <Text style={[styles.setLabel, { color: theme.colors.textPrimary }]}>Série {index + 1}</Text>
                  <Text
                    style={[
                      styles.setStatus,
                      { color: set.done_at ? theme.colors.success : theme.colors.textSecondary },
                    ]}>
                    {set.done_at ? '✓ Validée' : 'Appui long pour valider'}
                  </Text>
                </View>
                <View style={styles.stepperRow}>
                  <Stepper
                    label="Reps"
                    value={set.reps}
                    suffix=""
                    onIncrement={() => handleAdjustSet(set, 'reps', 1)}
                    onDecrement={() => handleAdjustSet(set, 'reps', -1)}
                  />
                  <Stepper
                    label="Poids"
                    value={set.weight ?? 0}
                    suffix="kg"
                    onIncrement={() => handleAdjustSet(set, 'weight', 2.5)}
                    onDecrement={() => handleAdjustSet(set, 'weight', -2.5)}
                  />
                  <Stepper
                    label="RPE"
                    value={set.rpe ?? 0}
                    suffix=""
                    onIncrement={() => handleAdjustSet(set, 'rpe', 0.5)}
                    onDecrement={() => handleAdjustSet(set, 'rpe', -0.5)}
                  />
                </View>
                <View style={styles.setFooter}>
                  <TouchableOpacity onPress={() => handleToggleCompletion(set)}>
                    <Text style={[styles.validateText, { color: theme.colors.success }]}>
                      {set.done_at ? 'Annuler' : '✓ Valider'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleRemoveSet(set.id)}>
                    <Text style={[styles.remove, { color: theme.colors.error }]}>Supprimer</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            ))}
          </View>
        );
      }}
    />
  );
};

interface StepperProps {
  label: string;
  value: number;
  suffix?: string;
  onIncrement: () => void;
  onDecrement: () => void;
}

const Stepper: React.FC<StepperProps> = ({ label, value, suffix = '', onIncrement, onDecrement }) => {
  const { theme } = useAppTheme();
  return (
    <View style={styles.stepper}>
      <Text style={[styles.stepperLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <View style={[styles.stepperControls, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
        <TouchableOpacity onPress={onDecrement} style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.stepperButtonText, { color: theme.colors.textPrimary }]}>-</Text>
        </TouchableOpacity>
        <Text style={[styles.stepperValue, { color: theme.colors.textPrimary }]}>
          {Number.isFinite(value) ? value : 0} {suffix}
        </Text>
        <TouchableOpacity onPress={onIncrement} style={[styles.stepperButton, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.stepperButtonText, { color: theme.colors.textPrimary }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  header: {
    marginBottom: 12,
    gap: 6,
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
  },
  queueBadge: {
    marginTop: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  queueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  modeBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 4,
  },
  restLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  restControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  restValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  restButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  restRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  restRingInner: {
    position: 'absolute',
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 3,
  },
  restRingProgress: {
    borderWidth: 3,
  },
  restRingContent: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  exerciseActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'flex-end',
  },
  linkButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    maxWidth: 140,
    alignSelf: 'flex-start',
  },
  linkButtonText: {
    fontWeight: '600',
    fontSize: 13,
  },
  emptySetsHint: {
    fontStyle: 'italic',
    fontSize: 14,
  },
  setRow: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  setRowCompleted: {
    // Couleurs gérées dynamiquement
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setLabel: {
    fontWeight: '600',
    fontSize: 16,
  },
  setStatus: {
    fontSize: 12,
  },
  setStatusDone: {
    fontWeight: '600',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepper: {
    flex: 1,
    gap: 4,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '700',
    minWidth: 50,
    textAlign: 'center',
  },
  setFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  validateText: {
    fontWeight: '600',
    fontSize: 14,
  },
  remove: {
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyExercises: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
  },
  emptyExercisesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyExercisesSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  completeButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  completeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
});
