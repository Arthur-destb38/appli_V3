import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppCard } from '@/components/AppCard';
import { updateRemoteProfile } from '@/services/userProfileApi';
import { uploadAvatar } from '@/services/profileApi';

const CURRENT_USER_ID = 'guest-user';

export default function ProfileScreen() {
  const { theme } = useAppTheme();
  const { profile, refresh } = useUserProfile();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editObjective, setEditObjective] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const menuItems = [
    { label: 'Mon profil public', route: '/profile/guest-user', icon: 'person-outline' as const },
    { label: 'Historique', route: '/history', icon: 'time-outline' as const },
    { label: 'Mon Programme', route: '/programme', icon: 'calendar-outline' as const },
    { label: 'Classement', route: '/leaderboard', icon: 'trophy-outline' as const },
    { label: 'Notifications', route: '/notifications', icon: 'notifications-outline' as const },
  ];

  const settingsItems = [
    { label: 'Paramètres', route: '/settings', icon: 'settings-outline' as const },
    { label: 'Conditions d\'utilisation', route: '/legal/terms', icon: 'document-text-outline' as const },
    { label: 'Confidentialité', route: '/legal/privacy', icon: 'shield-outline' as const },
  ];

  const openEditModal = () => {
    setEditUsername(profile?.username || '');
    setEditBio(profile?.bio || '');
    setEditObjective(profile?.objective || '');
    setEditModalVisible(true);
  };

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      Alert.alert('Erreur', 'Le nom d\'utilisateur ne peut pas être vide');
      return;
    }

    setSaving(true);
    try {
      await updateRemoteProfile(profile?.id || CURRENT_USER_ID, {
        username: editUsername.trim(),
        bio: editBio.trim() || undefined,
        objective: editObjective.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await refresh();
      setEditModalVisible(false);
      Alert.alert('✅ Profil mis à jour !');
    } catch (error: any) {
      if (error.code === 'username_taken') {
        Alert.alert('Erreur', 'Ce nom d\'utilisateur est déjà pris');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder le profil');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePickAvatar = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission requise', 'Autorise l\'accès à tes photos pour changer ton avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploadingAvatar(true);
      try {
        await uploadAvatar(profile?.id || CURRENT_USER_ID, result.assets[0].base64);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        await refresh();
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de changer l\'avatar');
      } finally {
        setUploadingAvatar(false);
      }
    }
  };

  const avatarUri = profile?.avatar_url;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100, paddingTop: insets.top + 16 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header profil */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {(profile?.username || 'U').charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            )}
            <View style={[styles.editAvatarBadge, { backgroundColor: theme.colors.accent }]}>
              {uploadingAvatar ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera" size={14} color="#fff" />
              )}
            </View>
          </TouchableOpacity>

          <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
            {profile?.username || 'Utilisateur'}
          </Text>
          <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
            {profile?.bio || 'Aucune bio définie'}
          </Text>
          {profile?.objective && (
            <View style={[styles.objectiveBadge, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="trophy-outline" size={14} color={theme.colors.accent} />
              <Text style={[styles.objectiveText, { color: theme.colors.accent }]}>
                {profile.objective}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.editButton, { borderColor: theme.colors.accent }]}
            onPress={openEditModal}
          >
            <Ionicons name="pencil" size={16} color={theme.colors.accent} />
            <Text style={[styles.editButtonText, { color: theme.colors.accent }]}>
              Modifier le profil
            </Text>
          </TouchableOpacity>
        </View>

        {/* Menu principal */}
        <AppCard style={styles.card}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                index !== menuItems.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={theme.colors.accent} />
                <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </AppCard>

        {/* Paramètres */}
        <AppCard style={styles.card}>
          {settingsItems.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                index !== settingsItems.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: theme.colors.border,
                },
              ]}
              onPress={() => router.push(item.route as never)}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon} size={22} color={theme.colors.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.colors.textPrimary }]}>
                  {item.label}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </AppCard>

        {/* Version */}
        <Text style={[styles.version, { color: theme.colors.textSecondary }]}>
          Gorillax v1.0.0
        </Text>
      </ScrollView>

      {/* Modal d'édition */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Modifier le profil
              </Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Nom d'utilisateur
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                }]}
                value={editUsername}
                onChangeText={setEditUsername}
                placeholder="Ton pseudo"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Bio
              </Text>
              <TextInput
                style={[styles.input, styles.textArea, { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                }]}
                value={editBio}
                onChangeText={setEditBio}
                placeholder="Parle de toi..."
                placeholderTextColor={theme.colors.textSecondary}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Objectif
              </Text>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.colors.background,
                  color: theme.colors.textPrimary,
                  borderColor: theme.colors.border,
                }]}
                value={editObjective}
                onChangeText={setEditObjective}
                placeholder="Ex: Prise de masse, Perte de poids..."
                placeholderTextColor={theme.colors.textSecondary}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: theme.colors.accent }]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Enregistrer</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 8,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  objectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 12,
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 0,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
