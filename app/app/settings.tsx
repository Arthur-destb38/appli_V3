import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useRouter } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { AppCard } from '@/components/AppCard';
import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';

const toTimeLabel = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

const SettingsScreen: React.FC = () => {
  const router = useRouter();
  const { theme, mode, setMode } = useAppTheme();
  const { profile, updateProfile } = useUserProfile();
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [usageMinutes] = useState(0);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(profile?.username ?? '');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [notificationTime, setNotificationTime] = useState<Date>(() => {
    const base = new Date();
    base.setHours(18);
    base.setMinutes(0);
    base.setSeconds(0);
    base.setMilliseconds(0);
    return base;
  });
  const [isPickingTime, setIsPickingTime] = useState(false);

  const switchTrackColor = {
    false: mode === 'dark' ? theme.colors.surfaceMuted : theme.colors.border,
    true: theme.colors.accent,
  };
  const switchThumbColor = mode === 'dark' ? theme.colors.surface : '#FFFFFF';
  const switchIosBackground = mode === 'dark' ? theme.colors.surfaceMuted : theme.colors.border;
  const notificationLabel = useMemo(() => `Recevoir un rappel quotidien à ${toTimeLabel(notificationTime)}.`, [notificationTime]);

  const incrementHours = (delta: number) => {
    setNotificationTime((prev) => {
      const next = new Date(prev);
      let hours = next.getHours() + delta;
      if (hours < 0) {
        hours = 24 + hours;
      }
      if (hours >= 24) {
        hours = hours % 24;
      }
      next.setHours(hours);
      return next;
    });
  };

  const incrementMinutes = (delta: number) => {
    setNotificationTime((prev) => {
      const next = new Date(prev);
      let minutes = next.getMinutes() + delta;
      while (minutes < 0) {
        minutes += 60;
      }
      while (minutes >= 60) {
        minutes -= 60;
      }
      next.setMinutes(minutes);
      return next;
    });
  };

  const handleConsentToggle = async (value: boolean) => {
    try {
      await updateProfile({ consent_to_public_share: value });
    } catch (error) {
      console.warn('Failed to update consent', error);
    }
  };

  const openPrivacyPolicy = () => {
    router.push('/legal/privacy');
  };

  useEffect(() => {
    setUsernameDraft(profile?.username ?? '');
  }, [profile?.username]);

  const openUsernameModal = () => {
    setUsernameDraft(profile?.username ?? '');
    setUsernameError(null);
    setIsEditingUsername(true);
  };

  const handleSaveUsername = async () => {
    const next = usernameDraft.trim();
    if (!next) {
      setUsernameError('Le pseudo ne peut pas être vide.');
      return;
    }
    if (next.length < 3) {
      setUsernameError('Choisis un pseudo d’au moins 3 caractères.');
      return;
    }
    try {
      await updateProfile({ username: next });
      setIsEditingUsername(false);
    } catch (error) {
      console.warn('Failed to update username', error);
      setUsernameError('Impossible de mettre à jour le pseudo pour le moment.');
    }
  };

  return (
    <>
      <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>Paramètres</Text>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Profil</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Pseudo</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>{profile?.username}</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={openUsernameModal}>
              <Text style={[styles.iconLabel, { color: theme.colors.textSecondary }]}>✏️</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Partage public</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
                Autoriser les séances partagées à apparaître dans le feed
              </Text>
            </View>
            <Switch
              value={profile?.consent_to_public_share ?? false}
              onValueChange={handleConsentToggle}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              ios_backgroundColor={switchIosBackground}
            />
          </View>
        </AppCard>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Confidentialité</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Politique de confidentialité</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
                Comprends comment tes données sont utilisées et partagées.
              </Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={openPrivacyPolicy}>
              <Text style={[styles.iconLabel, { color: theme.colors.textSecondary }]}>🔗</Text>
            </TouchableOpacity>
          </View>
        </AppCard>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Apparence</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Mode sombre</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>
                Active le thème sombre, sinon le thème clair.
              </Text>
            </View>
            <Switch
              value={mode === 'dark'}
              onValueChange={(value) => setMode(value ? 'dark' : 'light')}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              ios_backgroundColor={switchIosBackground}
            />
          </View>
        </AppCard>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Notifications</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Rappels d'entraînement</Text>
              <Text style={[styles.value, { color: theme.colors.textSecondary }]}>{notificationLabel}</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={setNotificationsOn}
              trackColor={switchTrackColor}
              thumbColor={switchThumbColor}
              ios_backgroundColor={switchIosBackground}
            />
          </View>
          {notificationsOn ? (
            <View style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.timeButton, { borderColor: theme.colors.border }]}
                onPress={() => setIsPickingTime(true)}
              >
                <Text style={[styles.timeButtonText, { color: theme.colors.textPrimary }]}>
                  Modifier l'heure
                </Text>
              </TouchableOpacity>
              <Text style={[styles.timeValue, { color: theme.colors.textSecondary }]}>
                {toTimeLabel(notificationTime)}
              </Text>
            </View>
          ) : null}
        </AppCard>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Utilisation</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Temps sur la dernière semaine</Text>
            <Text style={[styles.value, { color: theme.colors.textSecondary }]}>{usageMinutes} min</Text>
          </View>
        <AppButton
          title="Réinitialiser"
          variant="primary"
          style={[
            styles.resetButton,
            {
              backgroundColor: theme.colors.accent,
              borderWidth: 0,
            },
          ]}
          onPress={() => console.log('reset usage')}
        />
        </AppCard>

        <AppCard>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>Légal</Text>
        <TouchableOpacity onPress={() => router.push('/legal/terms')}>
          <Text style={[styles.link, { color: theme.colors.accent }]}>Conditions générales d'utilisation</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/legal/privacy')}>
          <Text style={[styles.link, { color: theme.colors.accent }]}>Politique de confidentialité</Text>
        </TouchableOpacity>
      </AppCard>
      </ScrollView>

      <Modal
        animationType="fade"
        transparent
        visible={isEditingUsername}
        onRequestClose={() => setIsEditingUsername(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Modifier le pseudo</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Choisis un pseudo pour ton profil.
            </Text>
            <TextInput
              value={usernameDraft}
              onChangeText={(text) => {
                setUsernameDraft(text);
                if (usernameError) {
                  setUsernameError(null);
                }
              }}
              placeholder="Entrez un pseudo"
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.input,
                { color: theme.colors.textPrimary, borderColor: theme.colors.border },
              ]}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameError ? (
              <Text style={[styles.errorText, { color: theme.colors.error }]}>{usernameError}</Text>
            ) : null}
            <View style={styles.modalActions}>
              <View style={styles.modalActionWrapper}>
                <AppButton title="Annuler" variant="secondary" onPress={() => setIsEditingUsername(false)} />
              </View>
              <View style={styles.modalActionWrapper}>
                <AppButton title="Enregistrer" onPress={handleSaveUsername} />
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isPickingTime}
        onRequestClose={() => setIsPickingTime(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>Heure du rappel</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              Choisis l&apos;heure pour recevoir ta notification quotidienne.
            </Text>
            <View style={styles.timePickerRow}>
              <View style={styles.timeColumn}>
                <Text style={[styles.timeColumnLabel, { color: theme.colors.textSecondary }]}>Heures</Text>
                <View style={[styles.stepper, { borderColor: theme.colors.border }]}>
                  <TouchableOpacity style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => incrementHours(-1)}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.textPrimary }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValueLarge, { color: theme.colors.textPrimary }]}>
                    {notificationTime.getHours().toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => incrementHours(1)}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.timeColumn}>
                <Text style={[styles.timeColumnLabel, { color: theme.colors.textSecondary }]}>Minutes</Text>
                <View style={[styles.stepper, { borderColor: theme.colors.border }]}>
                  <TouchableOpacity style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => incrementMinutes(-5)}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.textPrimary }]}>-</Text>
                  </TouchableOpacity>
                  <Text style={[styles.timeValueLarge, { color: theme.colors.textPrimary }]}>
                    {notificationTime.getMinutes().toString().padStart(2, '0')}
                  </Text>
                  <TouchableOpacity style={[styles.stepperButton, { backgroundColor: theme.colors.surfaceMuted }]} onPress={() => incrementMinutes(5)}>
                    <Text style={[styles.stepperLabel, { color: theme.colors.textPrimary }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <View style={styles.modalActions}>
              <View style={styles.modalActionWrapper}>
                <AppButton title="Fermer" variant="secondary" onPress={() => setIsPickingTime(false)} />
              </View>
              <View style={styles.modalActionWrapper}>
                <AppButton title="Valider" onPress={() => setIsPickingTime(false)} />
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  value: {
    fontSize: 14,
  },
  link: {
    fontSize: 15,
    marginBottom: 8,
  },
  iconButton: {
    padding: 8,
  },
  iconLabel: {
    fontSize: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalSubtitle: {
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'flex-end',
  },
  modalActionWrapper: {
    flex: 1,
  },
  errorText: {
    fontSize: 13,
  },
  resetButton: {
    marginTop: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  timeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  timeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  timeValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  timePickerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    marginTop: 16,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'stretch',
    gap: 12,
  },
  timeColumnLabel: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 12,
    width: '100%',
  },
  stepperButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  timeValueLarge: {
    fontSize: 24,
    fontWeight: '700',
  },
});
