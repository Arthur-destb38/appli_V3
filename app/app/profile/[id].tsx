import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import {
  Profile,
  UserPost,
  getProfile,
  getUserPosts,
  followUser,
  unfollowUser,
} from '@/services/profileApi';
import { AvatarPicker } from '@/components/AvatarPicker';
import { AppButton } from '@/components/AppButton';

const CURRENT_USER_ID = 'guest-user'; // TODO: récupérer depuis useAuth

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  const loadProfile = async () => {
    if (!id) return;
    try {
      const [profileData, postsData] = await Promise.all([
        getProfile(id, CURRENT_USER_ID),
        getUserPosts(id),
      ]);
      setProfile(profileData);
      setPosts(postsData.posts);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadProfile();
  };

  const handleFollowToggle = async () => {
    if (!profile || followLoading) return;
    
    setFollowLoading(true);
    Haptics.selectionAsync().catch(() => {});
    
    try {
      if (profile.is_following) {
        await unfollowUser(profile.id, CURRENT_USER_ID);
        setProfile({
          ...profile,
          is_following: false,
          followers_count: profile.followers_count - 1,
        });
      } else {
        await followUser(profile.id, CURRENT_USER_ID);
        setProfile({
          ...profile,
          is_following: true,
          followers_count: profile.followers_count + 1,
        });
      }
    } catch (error) {
      console.error('Failed to toggle follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.colors.background }]}>
        <Ionicons name="person-outline" size={64} color={theme.colors.textSecondary} />
        <Text style={[styles.errorText, { color: theme.colors.textPrimary }]}>
          Profil introuvable
        </Text>
        <AppButton
          title="Retour"
          onPress={() => router.back()}
          style={styles.backButton}
        />
      </View>
    );
  }

  const initials = profile.username.slice(0, 2).toUpperCase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={theme.colors.accent}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>
          {profile.username}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Profile Info */}
      <View style={styles.profileSection}>
        {/* Avatar */}
        <View style={styles.avatarRow}>
          <AvatarPicker
            userId={profile.id}
            currentAvatarUrl={profile.avatar_url}
            username={profile.username}
            size={90}
            editable={profile.is_own_profile}
            onAvatarChange={(newUrl) => {
              setProfile({ ...profile, avatar_url: newUrl });
            }}
          />

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {profile.posts_count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Posts
              </Text>
            </View>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {profile.followers_count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Abonnés
              </Text>
            </Pressable>
            <Pressable style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.colors.textPrimary }]}>
                {profile.following_count}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Suivi(e)s
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Username & Bio */}
        <View style={styles.bioSection}>
          <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
            {profile.username}
          </Text>
          {profile.objective && (
            <View style={[styles.objectiveBadge, { backgroundColor: theme.colors.accent + '20' }]}>
              <Ionicons name="fitness" size={14} color={theme.colors.accent} />
              <Text style={[styles.objectiveText, { color: theme.colors.accent }]}>
                {profile.objective}
              </Text>
            </View>
          )}
          {profile.bio && (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              {profile.bio}
            </Text>
          )}
          {profile.total_likes > 0 && (
            <View style={styles.likesInfo}>
              <Ionicons name="heart" size={14} color={theme.colors.error} />
              <Text style={[styles.likesText, { color: theme.colors.textSecondary }]}>
                {profile.total_likes} J'aime reçus
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {profile.is_own_profile ? (
            <AppButton
              title="Modifier le profil"
              variant="secondary"
              onPress={() => {/* TODO: Edit profile modal */}}
              style={styles.editButton}
            />
          ) : (
            <>
              <AppButton
                title={profile.is_following ? 'Abonné' : 'Suivre'}
                variant={profile.is_following ? 'secondary' : 'primary'}
                loading={followLoading}
                onPress={handleFollowToggle}
                disabled={followLoading}
                style={styles.followButton}
              />
              <Pressable
                style={({ pressed }) => [
                  styles.messageButton,
                  { backgroundColor: theme.colors.surfaceMuted, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <Ionicons name="chatbubble-outline" size={18} color={theme.colors.textPrimary} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Posts Grid */}
      <View style={[styles.postsSection, { borderColor: theme.colors.border }]}>
        <View style={styles.postsTabs}>
          <Pressable style={[styles.postsTab, styles.postsTabActive]}>
            <Ionicons name="grid" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.postsTab}>
            <Ionicons name="bookmark-outline" size={22} color={theme.colors.textSecondary} />
          </Pressable>
        </View>

        {posts.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Ionicons name="images-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyPostsText, { color: theme.colors.textSecondary }]}>
              Aucune séance partagée
            </Text>
          </View>
        ) : (
          <View style={styles.postsGrid}>
            {posts.map((post) => (
              <Pressable
                key={post.share_id}
                style={[styles.postCard, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => {/* TODO: Navigate to post detail */}}
              >
                <Ionicons name="barbell" size={24} color={theme.colors.accent} />
                <Text
                  style={[styles.postTitle, { color: theme.colors.textPrimary }]}
                  numberOfLines={2}
                >
                  {post.workout_title}
                </Text>
                <View style={styles.postMeta}>
                  <View style={styles.postMetaItem}>
                    <Ionicons name="heart" size={12} color={theme.colors.error} />
                    <Text style={[styles.postMetaText, { color: theme.colors.textSecondary }]}>
                      {post.like_count}
                    </Text>
                  </View>
                  <Text style={[styles.postMetaText, { color: theme.colors.textSecondary }]}>
                    {post.exercise_count} exos
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backIcon: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 13,
  },
  bioSection: {
    gap: 6,
  },
  username: {
    fontSize: 15,
    fontWeight: '700',
  },
  objectiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  objectiveText: {
    fontSize: 13,
    fontWeight: '600',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
  },
  likesInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  likesText: {
    fontSize: 13,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  followButton: {
    flex: 1,
  },
  messageButton: {
    width: 44,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flex: 1,
  },
  postsSection: {
    marginTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  postsTabs: {
    flexDirection: 'row',
  },
  postsTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  postsTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  emptyPosts: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyPostsText: {
    fontSize: 14,
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 2,
  },
  postCard: {
    width: '33%',
    aspectRatio: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 4,
  },
  postTitle: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  postMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  postMetaText: {
    fontSize: 10,
  },
});
