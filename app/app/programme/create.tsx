import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable, Alert } from 'react-native';

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
    setFrequency((prev) => clamp(prev + delta, 2, 6));
  };

  const updateExercisesPerSession = (delta: number) => {
    setExercisesPerSession((prev) => clamp(prev + delta, 3, 8));
  };

  const updateDurationWeeks = (delta: number) => {
    setDurationWeeks((prev) => clamp(prev + delta, 2, 16));
  };

  const handleGenerate = async () => {
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
    } catch (e: any) {
      setError(e?.message || "Génération impossible");
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

      const suffix = modeSport ? '?mode=1' : '';
      router.push(`/track/${draft.workout.id}${suffix}`);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || "Impossible de démarrer la séance");
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
        <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
          Paramètres rapides
        </Text>
        <View style={styles.row}>
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Objectif</Text>
            <View style={styles.pills}>
              {objectivePresets.map((item) => {
                const active = item.toLowerCase() === objective.toLowerCase();
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                        borderColor: 'transparent',
                      },
                    ]}
                    onPress={() => setObjective(item)}
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
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Fréquence</Text>
            <View style={styles.counter}>
              <Pressable style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => updateFrequency(-1)}>
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>-</Text>
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>{frequency} / semaine</Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Cible : 2 à 6</Text>
              </View>
              <Pressable style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => updateFrequency(1)}>
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Exos / séance
            </Text>
            <View style={styles.counter}>
              <Pressable style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => updateExercisesPerSession(-1)}>
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>-</Text>
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>{exercisesPerSession}</Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>Plage : 3 à 8</Text>
              </View>
              <Pressable style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => updateExercisesPerSession(1)}>
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.controlBlock}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Durée (semaines)</Text>
            <View style={styles.counter}>
              <Pressable
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => updateDurationWeeks(-1)}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>-</Text>
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>
                  {durationWeeks}
                </Text>
                <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>2 à 16</Text>
              </View>
              <Pressable
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => updateDurationWeeks(1)}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.controlBlock}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Durée séance (min)
            </Text>
            <View style={styles.counter}>
              <Pressable
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setDureeSeance(String(Math.max(30, parseInt(dureeSeance) - 15)))}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>-</Text>
              </Pressable>
              <View style={styles.counterStack}>
                <Text style={[styles.counterValue, { color: theme.colors.textPrimary }]}>
                  {dureeSeance} min
                </Text>
              </View>
              <Pressable
                style={[styles.chip, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => setDureeSeance(String(Math.min(90, parseInt(dureeSeance) + 15)))}
              >
                <Text style={[styles.chipLabel, { color: theme.colors.textPrimary }]}>+</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Niveau</Text>
            <View style={styles.pills}>
              {['Débutant', 'Intermédiaire', 'Avancé'].map((item) => {
                const active = item === niveau;
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setNiveau(item)}
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
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Méthode préférée</Text>
            <View style={styles.pills}>
              {['', 'fullbody', 'upperlower', 'split', 'ppl'].map((item) => {
                const active = item === methodePreferee;
                const label = item === '' ? 'Auto' : item.charAt(0).toUpperCase() + item.slice(1);
                return (
                  <Pressable
                    key={item}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: active ? theme.colors.accent : theme.colors.surfaceMuted,
                      },
                    ]}
                    onPress={() => setMethodePreferee(item)}
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
            <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
              Blessures / contraintes
            </Text>
            <TextInput
              value={blessureFirst}
              onChangeText={setBlessureFirst}
              placeholder="Genou fragile, dos..."
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                { backgroundColor: theme.colors.card, color: theme.colors.textPrimary },
              ]}
            />
          </View>
        </View>

        <AppButton
          title={loading ? 'Génération...' : 'Générer un programme'}
          onPress={handleGenerate}
          disabled={loading}
          style={[styles.ctaButton, { backgroundColor: theme.colors.accent }]}
        />
        {error ? (
          <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        ) : null}
      </AppCard>

      {program && (
        <AppCard>
          <View style={styles.headerRow}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {program.title}
            </Text>
            <View style={[styles.badge, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
                {program.sessions.length} séances
              </Text>
            </View>
          </View>
          <Text style={[styles.helper, { color: theme.colors.textSecondary }]}>
            Objectif : {program.objective || 'Général'} • {program.duration_weeks} semaine(s)
          </Text>

          {program.sessions.map((sess) => (
            <View
              key={sess.day_index}
              style={[
                styles.session,
                {
                  borderColor: theme.colors.border,
                  backgroundColor: theme.colors.surfaceMuted,
                },
              ]}
              >
              <View style={styles.sessionHeader}>
                <View>
                  <Text style={[styles.sessionTitle, { color: theme.colors.textPrimary }]}>
                    {sess.title}
                  </Text>
                  <Text style={[styles.sessionFocus, { color: theme.colors.textSecondary }]}>
                    Focus : {sess.focus}
                  </Text>
                </View>
                <View style={styles.sessionActions}>
                  <AppButton
                    title={launchingSession === sess.day_index ? 'Ouverture...' : 'Mode sport'}
                    variant="secondary"
                    disabled={launchingSession !== null}
                    style={styles.startButton}
                    onPress={() => handleStartSession(sess, true)}
                  />
                  <AppButton
                    title="Démarrer"
                    variant="ghost"
                    disabled={launchingSession !== null}
                    style={styles.startButton}
                    onPress={() => handleStartSession(sess, false)}
                  />
                </View>
              </View>
              {sess.sets.map((s) => (
                <View key={`${sess.day_index}-${s.order_index}`} style={styles.setRow}>
                  <Text style={[styles.setName, { color: theme.colors.textPrimary }]}>
                    {s.exercise_slug.replace(/-/g, ' ')}
                  </Text>
                  <Text style={[styles.setMeta, { color: theme.colors.textSecondary }]}>
                    {typeof s.reps === 'number' ? `${s.reps} reps` : s.reps} • ordre {s.order_index + 1}
                  </Text>
                </View>
              ))}
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    marginBottom: 6,
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
