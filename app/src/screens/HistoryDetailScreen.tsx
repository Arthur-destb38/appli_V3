import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

import { findExerciseById } from '@/data/exercises';
import { useWorkouts } from '@/hooks/useWorkouts';
import { WorkoutSet } from '@/types/workout';
import {
  calculateExerciseVolume,
  calculateWorkoutDurationMs,
  calculateWorkoutVolume,
  formatDuration,
} from '@/utils/workoutSummary';

interface Props {
  workoutId: number;
}

const formatDate = (timestamp: number) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));

const formatSetLine = (set: WorkoutSet) => {
  const weightLabel = set.weight != null ? `${set.weight} kg` : 'Poids libre';
  const rpeLabel = set.rpe != null ? `RPE ${set.rpe}` : 'RPE ?';
  return `${set.reps} répétition(s) · ${weightLabel} · ${rpeLabel}`;
};

export const HistoryDetailScreen: React.FC<Props> = ({ workoutId }) => {
  const router = useRouter();
  const { findWorkout, duplicateWorkout } = useWorkouts();
  const [isDuplicating, setIsDuplicating] = useState(false);

  const workout = useMemo(() => findWorkout(workoutId), [findWorkout, workoutId]);

  const summary = useMemo(() => {
    if (!workout) {
      return {
        volume: 0,
        completedSets: 0,
        totalSets: 0,
        durationLabel: null as string | null,
      };
    }
    const volume = calculateWorkoutVolume(workout);
    const completedSets = workout.sets.filter((set) => Boolean(set.done_at)).length;
    const totalSets = workout.sets.length;
    const durationMs = calculateWorkoutDurationMs(workout.sets);
    return {
      volume,
      completedSets,
      totalSets,
      durationLabel: durationMs ? formatDuration(durationMs) : null,
    };
  }, [workout]);

  const exercises = useMemo(() => {
    if (!workout) {
      return [];
    }
    return [...workout.exercises]
      .sort((a, b) => a.order_index - b.order_index)
      .map((exercise) => {
        const sets = workout.sets
          .filter((set) => set.workout_exercise_id === exercise.id)
          .sort((a, b) => a.id - b.id);
        const catalogEntry = findExerciseById(exercise.exercise_id);
        return {
          id: exercise.id,
          code: exercise.exercise_id,
          name: catalogEntry?.name ?? exercise.exercise_id,
          sets,
          volume: calculateExerciseVolume(sets),
        };
      });
  }, [workout]);

  if (!workout) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>Séance introuvable</Text>
        <Text style={styles.emptySubtitle}>
          Retourne à l'historique pour sélectionner une séance valide.
        </Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/history')}>
          <Text style={styles.backButtonText}>Revenir à l'historique</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDuplicate = async () => {
    setIsDuplicating(true);
    try {
      const duplicated = await duplicateWorkout(workout.workout.id);
      if (!duplicated) {
        Alert.alert(
          'Duplication impossible',
          'Nous ne parvenons pas à dupliquer cette séance pour le moment.'
        );
        return;
      }
      router.push(`/create?id=${duplicated.workout.id}`);
    } catch (error) {
      console.warn('Failed to duplicate workout', error);
      Alert.alert(
        'Duplication impossible',
        'Une erreur est survenue lors de la duplication. Réessaie plus tard.'
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  const handleRelaunch = () => {
    router.push(`/track/${workout.workout.id}`);
  };

  const handleOpenProgress = (exerciseId: string, exerciseName: string) => {
    router.push({
      pathname: '/history/progression',
      params: {
        exerciseId,
        exerciseName,
      },
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>{workout.workout.title}</Text>
          <View
            style={[
              styles.statusBadge,
              workout.workout.status === 'completed' ? styles.badgeCompleted : styles.badgeDraft,
            ]}>
            <Text style={styles.statusText}>
              {workout.workout.status === 'completed' ? 'Terminée' : 'Brouillon'}
            </Text>
          </View>
        </View>
        <Text style={styles.metaLine}>
          {formatDate(workout.workout.updated_at)} · {workout.exercises.length} exercice(s) ·{' '}
          {workout.sets.length} série(s)
        </Text>
        <View style={styles.summaryRow}>
          <SummaryItem label="Volume total" value={`${Math.round(summary.volume)} kg`} />
          <SummaryItem
            label="Séries validées"
            value={`${summary.completedSets}/${summary.totalSets || 0}`}
          />
          <SummaryItem
            label="Durée estimée"
            value={summary.durationLabel ?? 'Non disponible'}
          />
        </View>
        {workout.workout.server_id ? (
          <View style={styles.syncBadge}>
            <Text style={styles.syncText}>Synchronisée</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={handleDuplicate}
          disabled={isDuplicating}>
          <Text style={styles.primaryButtonText}>
            {isDuplicating ? 'Duplication…' : 'Dupliquer'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.secondaryButton]} onPress={handleRelaunch}>
          <Text style={styles.secondaryButtonText}>Relancer</Text>
        </TouchableOpacity>
      </View>

      {exercises.length === 0 ? (
        <View style={styles.emptyExercises}>
          <Text style={styles.emptyExercisesTitle}>Aucun exercice enregistré</Text>
          <Text style={styles.emptyExercisesSubtitle}>
            Les exercices de cette séance n'ont pas encore été saisis.
          </Text>
        </View>
      ) : (
        exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <View>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseCode}>{exercise.code}</Text>
              </View>
              <View style={styles.exerciseMetaColumn}>
                <Text style={styles.exerciseMeta}>
                  {exercise.sets.length} série(s){' '}
                  {exercise.volume ? `· ${Math.round(exercise.volume)} kg` : ''}
                </Text>
                <TouchableOpacity
                  style={styles.progressLink}
                  onPress={() => handleOpenProgress(exercise.code, exercise.name)}>
                  <Text style={styles.progressLinkText}>Voir la progression</Text>
                </TouchableOpacity>
              </View>
            </View>
            {exercise.sets.length === 0 ? (
              <Text style={styles.noSets}>Aucune série enregistrée pour cet exercice.</Text>
            ) : (
              exercise.sets.map((set, index) => (
                <View
                  key={set.id}
                  style={[styles.setCard, set.done_at ? styles.setCardCompleted : null]}>
                  <View style={styles.setHeader}>
                    <Text style={styles.setTitle}>Série {index + 1}</Text>
                    <Text
                      style={[
                        styles.setStatus,
                        set.done_at ? styles.setStatusDone : styles.setStatusPlanned,
                      ]}>
                      {set.done_at ? 'Validée' : 'Planifiée'}
                    </Text>
                  </View>
                  <Text style={styles.setDescription}>{formatSetLine(set)}</Text>
                  {set.done_at ? (
                    <Text style={styles.setTimestamp}>Validée le {formatDate(set.done_at)}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ))
      )}
    </ScrollView>
  );
};

interface SummaryItemProps {
  label: string;
  value: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ label, value }) => (
  <View style={styles.summaryItem}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={styles.summaryValue}>{value}</Text>
  </View>
);

export default HistoryDetailScreen;

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  headerCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  badgeCompleted: {
    backgroundColor: '#DCFCE7',
  },
  badgeDraft: {
    backgroundColor: '#FDE68A',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0F172A',
  },
  metaLine: {
    fontSize: 14,
    color: '#475569',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  syncBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DBEAFE',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  syncText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#E11D48',
  },
  primaryButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: 'white',
  },
  secondaryButtonText: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  exerciseCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#0F172A0F',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseCode: {
    fontSize: 12,
    color: '#94A3B8',
  },
  exerciseMeta: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  exerciseMetaColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  progressLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
  },
  progressLinkText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  noSets: {
    color: '#6B7280',
    fontStyle: 'italic',
  },
  setCard: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  setCardCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#BBF7D0',
  },
  setHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setTitle: {
    fontWeight: '600',
    fontSize: 16,
  },
  setStatus: {
    fontSize: 12,
  },
  setStatusDone: {
    color: '#15803D',
    fontWeight: '700',
  },
  setStatusPlanned: {
    color: '#94A3B8',
  },
  setDescription: {
    fontSize: 14,
    color: '#334155',
  },
  setTimestamp: {
    fontSize: 12,
    color: '#475569',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  backButton: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: '#1D4ED8',
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  emptyExercises: {
    padding: 32,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    gap: 8,
  },
  emptyExercisesTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyExercisesSubtitle: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
  },
});
