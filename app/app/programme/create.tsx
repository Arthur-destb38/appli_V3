import React, { useMemo, useState, useRef, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Alert, Animated, Easing, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { useAppTheme } from '@/theme/ThemeProvider';
import { generateProgram } from '@/services/programsApi';
import { Program } from '@/types/program';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useRouter } from 'expo-router';

const CreateProgramScreen: React.FC = () => {
  const { theme } = useAppTheme();
  const [objective, setObjective] = useState('Hypertrophie');
  const [frequency, setFrequency] = useState(3);
  const [exercisesPerSession, setExercisesPerSession] = useState(4);
  const [durationWeeks, setDurationWeeks] = useState(4);
  const [constraints, setConstraints] = useState('');
  const [loading, setLoading] = useState(false);
  const [program, setProgram] = useState<Program | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [launchingSession, setLaunchingSession] = useState<number | null>(null);
  const { createDraft, addExercise, addSet } = useWorkouts();
  const router = useRouter();
  
  // Nouveaux états pour les paramètres V1
  const [niveau, setNiveau] = useState('Intermédiaire');
  const [dureeSeance, setDureeSeance] = useState('45');
  const [priorite, setPriorite] = useState<string>('');
  const [hasBlessure, setHasBlessure] = useState(false);
  const [blessureFirst, setBlessureFirst] = useState('');
  const [equipmentAvailable, setEquipmentAvailable] = useState<string[]>([]);
  const [methodePreferee, setMethodePreferee] = useState<string>('');

  const objectivePresets = useMemo(
    () => ['Hypertrophie', 'Force', 'Endurance', 'Remise en forme'],
    []
  );

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

  const updateFrequency = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setFrequency((prev) => clamp(prev + delta, 2, 6));
  };

  const updateExercisesPerSession = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setExercisesPerSession((prev) => clamp(prev + delta, 3, 8));
  };

  const updateDurationWeeks = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setDurationWeeks((prev) => clamp(prev + delta, 2, 16));
  };
  
  const updateDureeSeance = (delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    setDureeSeance(String(Math.max(30, Math.min(90, parseInt(dureeSeance) + delta))));
  };

  const handleGenerate = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setLoading(true);
    setError(null);
    try {
      const result = await generateProgram({
        objective,
        frequency,
        exercises_per_session: exercisesPerSession,
        duration_weeks: durationWeeks,
        niveau,
        duree_seance: dureeSeance,
        priorite: priorite || undefined,
        has_blessure: hasBlessure,
        blessure_first: blessureFirst || undefined,
        equipment_available: equipmentAvailable.length > 0 ? equipmentAvailable : undefined,
        methode_preferee: methodePreferee || undefined,
      });
      setProgram(result);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      setError(e?.message || "Génération impossible");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

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

  const handleStartSession = async (sess: Program['sessions'][number], modeSport = false) => {
    if (!sess.sets?.length) {
      Alert.alert('Séance vide', 'Cette séance ne contient pas de séries.');
      return;
    }
    Haptics.selectionAsync().catch(() => {});
    try {
      setLaunchingSession(sess.day_index);
      const draft = await createDraft(sess.title || `Séance ${sess.day_index + 1}`);
      if (!draft) {
        throw new Error("Impossible de créer la séance");
      }

      // regrouper les sets par exercice
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

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const suffix = modeSport ? '?mode=1' : '';
      router.push(`/track/${draft.workout.id}${suffix}`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || "Impossible de démarrer la séance");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLaunchingSession(null);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Créer un programme</Text>

      <AppCard>
        <View style={styles.sectionHeader}>
          <Ionicons name="settings-outline" size={20} color={theme.colors.accent} />
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
            Paramètres rapides
          </Text>
        </View>
        <View style={styles.row}>
          <View style={styles.inputBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="flag-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Objectif</Text>
            </View>
            <View style={styles.pills}>
              {objectivePresets.map((item) => {
                const active = item.toLowerCase() === objective.toLowerCase();
                return (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        borderWidth: active ? 0 : 1,
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setObjective(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.pillLabel,
                        { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.controlBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Fréquence</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateFrequency(-1)}
              >
                <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>{frequency}</Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>/ semaine</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateFrequency(1)}
              >
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.controlBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="barbell-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Exos / séance
              </Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateExercisesPerSession(-1)}
              >
                <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>{exercisesPerSession}</Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>exercices</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateExercisesPerSession(1)}
              >
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.controlBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="time-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Durée (semaines)</Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateDurationWeeks(-1)}
              >
                <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>
                  {durationWeeks}
                </Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>semaines</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateDurationWeeks(1)}
              >
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <View style={styles.controlBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="hourglass-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Durée séance
              </Text>
            </View>
            <View style={styles.counter}>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateDureeSeance(-15)}
              >
                <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>
                  {dureeSeance}
                </Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>minutes</Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  },
                ]}
                onPress={() => updateDureeSeance(15)}
              >
                <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="trophy-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Niveau</Text>
            </View>
            <View style={styles.pills}>
              {['Débutant', 'Intermédiaire', 'Avancé'].map((item) => {
                const active = item === niveau;
                return (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        borderWidth: active ? 0 : 1,
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setNiveau(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.pillLabel,
                        { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="fitness-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Méthode préférée</Text>
            </View>
            <View style={styles.pills}>
              {['', 'fullbody', 'upperlower', 'split', 'ppl'].map((item) => {
                const active = item === methodePreferee;
                const label = item === '' ? 'Auto' : item.charAt(0).toUpperCase() + item.slice(1);
                return (
                  <Pressable
                    key={item}
                    style={({ pressed }) => [
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                        borderColor: active ? theme.colors.accent : theme.colors.border,
                        borderWidth: active ? 0 : 1,
                        opacity: pressed ? 0.7 : 1,
                        transform: [{ scale: pressed ? 0.95 : 1 }],
                      },
                    ]}
                    onPress={() => {
                      Haptics.selectionAsync().catch(() => {});
                      setMethodePreferee(item);
                    }}
                  >
                    <Text
                      style={[
                        styles.pillLabel,
                        { color: active ? '#FFFFFF' : theme.colors.textPrimary },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.controlBlock}>
            <View style={styles.labelRow}>
              <Ionicons name="medical-outline" size={16} color={theme.colors.accent} />
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>
                Blessures / contraintes
              </Text>
            </View>
            <TextInput
              value={blessureFirst}
              onChangeText={setBlessureFirst}
              placeholder="Genou fragile, dos..."
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.ctaButton,
            {
              backgroundColor: theme.colors.accent,
              opacity: loading || pressed ? 0.8 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={handleGenerate}
          disabled={loading}
        >
          {loading ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.ctaButtonText}>Génération...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              <Text style={styles.ctaButtonText}>Générer un programme</Text>
            </View>
          )}
        </Pressable>
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={18} color={theme.colors.error} />
            <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
          </View>
        ) : null}
      </AppCard>

      {program && (
        <AppCard>
          <View style={styles.programHeader}>
            <View style={styles.programHeaderLeft}>
              <Ionicons name="fitness" size={24} color={theme.colors.accent} />
              <View>
                <Text style={[styles.programTitle, { color: theme.colors.textPrimary }]}>
                  {program.title}
                </Text>
                <Text style={[styles.programSubtitle, { color: theme.colors.textSecondary }]}>
                  {program.objective || 'Général'} • {program.duration_weeks} semaine(s)
                </Text>
              </View>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="calendar" size={14} color={theme.colors.accent} />
              <Text style={[styles.badgeText, { color: theme.colors.accent }]}>
                {program.sessions.length} séances
              </Text>
            </View>
          </View>

          {program.sessions.map((sess, index) => (
            <View
              key={sess.day_index}
              style={[
                styles.session,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surface,
                },
              ]}
            >
              <View style={styles.sessionHeader}>
                <View style={styles.sessionHeaderLeft}>
                  <View style={[styles.sessionNumber, { backgroundColor: theme.colors.accent + '20' }]}>
                    <Text style={[styles.sessionNumberText, { color: theme.colors.accent }]}>
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.sessionInfo}>
                    <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]}>
                      {sess.title}
                    </Text>
                    <View style={styles.sessionFocusRow}>
                      <Ionicons name="barbell-outline" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>
                        {sess.focus}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
              
              <View style={styles.exercisesList}>
                {sess.sets.slice(0, 3).map((s) => (
                  <View key={`${sess.day_index}-${s.order_index}`} style={styles.exerciseItem}>
                    <Ionicons name="ellipse" size={6} color={theme.colors.accent} />
                    <Text style={[styles.exerciseName, { color: theme.colors.textPrimary }]}>
                      {s.exercise_slug.replace(/-/g, ' ')}
                    </Text>
                    <Text style={[styles.exerciseMeta, { color: theme.colors.textSecondary }]}>
                      {typeof s.reps === 'number' ? `${s.reps} reps` : s.reps}
                    </Text>
                  </View>
                ))}
                {sess.sets.length > 3 && (
                  <Text style={[styles.moreExercises, { color: theme.colors.textSecondary }]}>
                    + {sess.sets.length - 3} exercices
                  </Text>
                )}
              </View>
              
              <View style={styles.sessionActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.startButton,
                    styles.startButtonSecondary,
                    {
                      backgroundColor: theme.colors.surfaceMuted,
                      borderColor: theme.colors.border,
                      opacity: launchingSession !== null || pressed ? 0.7 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleStartSession(sess, true)}
                  disabled={launchingSession !== null}
                >
                  {launchingSession === sess.day_index ? (
                    <ActivityIndicator color={theme.colors.accent} size="small" />
                  ) : (
                    <>
                      <Ionicons name="flash" size={16} color={theme.colors.accent} />
                      <Text style={[styles.startButtonText, { color: theme.colors.accent }]}>
                        Mode sport
                      </Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.startButton,
                    {
                      backgroundColor: theme.colors.accent,
                      opacity: launchingSession !== null || pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                  onPress={() => handleStartSession(sess, false)}
                  disabled={launchingSession !== null}
                >
                  {launchingSession === sess.day_index ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Ionicons name="play" size={16} color="#FFFFFF" />
                      <Text style={[styles.startButtonText, { color: '#FFFFFF' }]}>
                        Démarrer
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          ))}
        </AppCard>
      )}
    </ScrollView>
  );
};

export default CreateProgramScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  inputBlock: {
    flex: 1,
    minWidth: 150,
  },
  controlBlock: {
    flex: 1,
    minWidth: 160,
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'flex-start',
  },
  counterValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  counterStack: {
    alignItems: 'center',
    minWidth: 90,
  },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  helper: {
    fontSize: 13,
    marginTop: 4,
  },
  errorText: {
    marginTop: 8,
    fontSize: 14,
  },
  ctaButton: {
    marginTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  startButton: {
    minWidth: 120,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 8,
  },
  session: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  sessionHeader: {
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sessionFocus: {
    fontSize: 13,
  },
  setRow: {
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#00000010',
  },
  setName: {
    fontSize: 14,
    fontWeight: '600',
  },
  setMeta: {
    fontSize: 13,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 0,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});
