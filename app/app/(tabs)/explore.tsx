import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import {
  ExploreData,
  TrendingPost,
  SuggestedUser,
  SearchResult,
  getExplore,
  search,
} from '@/services/exploreApi';
import { followUser, unfollowUser } from '@/services/profileApi';

const CURRENT_USER_ID = 'guest-user';

export default function ExploreScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();

  const [data, setData] = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [searching, setSearching] = useState(false);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  const loadExplore = async () => {
    try {
      const exploreData = await getExplore(CURRENT_USER_ID);
      setData(exploreData);
    } catch (error) {
      console.error('Failed to load explore:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadExplore();
  }, []);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const results = await search(query.trim());
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleFollow = async (userId: string) => {
    Haptics.selectionAsync().catch(() => {});
    try {
      if (followingIds.has(userId)) {
        await unfollowUser(userId, CURRENT_USER_ID);
        setFollowingIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } else {
        await followUser(userId, CURRENT_USER_ID);
        setFollowingIds((prev) => new Set(prev).add(userId));
      }
    } catch (error) {
      console.error('Follow failed:', error);
    }
  };

  const renderUserCard = (user: SuggestedUser) => {
    const isFollowing = followingIds.has(user.id);
    return (
      <View
        key={user.id}
        style={[styles.userCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      >
        <TouchableOpacity
          style={styles.userInfo}
          onPress={() => router.push(`/profile/${user.id}`)}
        >
          <View style={[styles.userAvatar, { backgroundColor: theme.colors.accent + '25' }]}>
            <Text style={[styles.userAvatarText, { color: theme.colors.accent }]}>
              {user.username.slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.textPrimary }]}>
              {user.username}
            </Text>
            {user.objective && (
              <Text style={[styles.userObjective, { color: theme.colors.textSecondary }]}>
                {user.objective}
              </Text>
            )}
            <Text style={[styles.userStats, { color: theme.colors.textSecondary }]}>
              {user.followers_count} abonnés · {user.posts_count} posts
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: isFollowing ? theme.colors.surfaceMuted : theme.colors.accent,
            },
          ]}
          onPress={() => handleFollow(user.id)}
        >
          <Text
            style={[
              styles.followBtnText,
              { color: isFollowing ? theme.colors.textPrimary : '#FFF' },
            ]}
          >
            {isFollowing ? 'Suivi' : 'Suivre'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPostCard = (post: TrendingPost, index: number) => (
    <Pressable
      key={post.share_id}
      style={[
        styles.postCard,
        { backgroundColor: theme.colors.surfaceMuted },
        index % 3 === 0 && styles.postCardLarge,
      ]}
      onPress={() => router.push(`/profile/${post.owner_id}`)}
    >
      <View style={styles.postIcon}>
        <Ionicons name="barbell" size={index % 3 === 0 ? 32 : 24} color={theme.colors.accent} />
      </View>
      <Text
        style={[styles.postTitle, { color: theme.colors.textPrimary }]}
        numberOfLines={2}
      >
        {post.workout_title}
      </Text>
      <View style={styles.postMeta}>
        <Text style={[styles.postUser, { color: theme.colors.textSecondary }]}>
          @{post.owner_username}
        </Text>
        <View style={styles.postLikes}>
          <Ionicons name="heart" size={12} color={theme.colors.error} />
          <Text style={[styles.postLikesText, { color: theme.colors.textSecondary }]}>
            {post.like_count}
          </Text>
        </View>
      </View>
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header avec recherche */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.textPrimary }]}>Explorer</Text>
      </View>

      {/* Barre de recherche */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surfaceMuted }]}>
        <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Rechercher utilisateurs, séances..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Résultats de recherche */}
      {searchQuery.length >= 2 ? (
        <ScrollView style={styles.searchResults}>
          {searching ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : searchResults ? (
            <>
              {searchResults.users.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitleSmall, { color: theme.colors.textSecondary }]}>
                    Utilisateurs
                  </Text>
                  {searchResults.users.map(renderUserCard)}
                </View>
              )}
              {searchResults.posts.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitleSmall, { color: theme.colors.textSecondary }]}>
                    Séances
                  </Text>
                  <View style={styles.postsGrid}>
                    {searchResults.posts.map((post, i) => renderPostCard(post, i))}
                  </View>
                </View>
              )}
              {searchResults.users.length === 0 && searchResults.posts.length === 0 && (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={48} color={theme.colors.textSecondary} />
                  <Text style={[styles.noResultsText, { color: theme.colors.textSecondary }]}>
                    Aucun résultat pour "{searchQuery}"
                  </Text>
                </View>
              )}
            </>
          ) : null}
        </ScrollView>
      ) : (
        /* Contenu Explore */
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadExplore();
              }}
              tintColor={theme.colors.accent}
            />
          }
        >
          {/* Suggestions d'utilisateurs */}
          {data?.suggested_users && data.suggested_users.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                  Suggestions pour toi
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
                {data.suggested_users.map((user) => (
                  <View
                    key={user.id}
                    style={[styles.suggestedUserCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
                  >
                    <TouchableOpacity onPress={() => router.push(`/profile/${user.id}`)}>
                      <View style={[styles.suggestedAvatar, { backgroundColor: theme.colors.accent + '25' }]}>
                        <Text style={[styles.suggestedAvatarText, { color: theme.colors.accent }]}>
                          {user.username.slice(0, 2).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.suggestedName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                        {user.username}
                      </Text>
                      <Text style={[styles.suggestedStats, { color: theme.colors.textSecondary }]}>
                        {user.followers_count} abonnés
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.suggestedFollowBtn,
                        {
                          backgroundColor: followingIds.has(user.id)
                            ? theme.colors.surfaceMuted
                            : theme.colors.accent,
                        },
                      ]}
                      onPress={() => handleFollow(user.id)}
                    >
                      <Text
                        style={[
                          styles.suggestedFollowText,
                          { color: followingIds.has(user.id) ? theme.colors.textPrimary : '#FFF' },
                        ]}
                      >
                        {followingIds.has(user.id) ? 'Suivi' : 'Suivre'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Posts trending */}
          {data?.trending_posts && data.trending_posts.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }, { paddingHorizontal: 16 }]}>
                🔥 Tendances
              </Text>
              <View style={styles.postsGrid}>
                {data.trending_posts.map((post, i) => renderPostCard(post, i))}
              </View>
            </View>
          )}

          {/* État vide */}
          {(!data?.trending_posts || data.trending_posts.length === 0) &&
           (!data?.suggested_users || data.suggested_users.length === 0) && (
            <View style={styles.emptyState}>
              <Ionicons name="compass-outline" size={64} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
                Rien à explorer
              </Text>
              <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
                Reviens plus tard pour découvrir du contenu
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  searchResults: {
    flex: 1,
    paddingHorizontal: 16,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  usersScroll: {
    paddingLeft: 16,
  },
  suggestedUserCard: {
    width: 140,
    padding: 16,
    marginRight: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    gap: 8,
  },
  suggestedAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestedAvatarText: {
    fontSize: 22,
    fontWeight: '700',
  },
  suggestedName: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  suggestedStats: {
    fontSize: 12,
  },
  suggestedFollowBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  suggestedFollowText: {
    fontSize: 13,
    fontWeight: '600',
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
  },
  userObjective: {
    fontSize: 13,
  },
  userStats: {
    fontSize: 12,
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  postsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
  },
  postCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    padding: 10,
    justifyContent: 'space-between',
  },
  postCardLarge: {
    width: '48%',
    aspectRatio: 1.2,
  },
  postIcon: {
    marginBottom: 4,
  },
  postTitle: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  postMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  postUser: {
    fontSize: 10,
  },
  postLikes: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  postLikesText: {
    fontSize: 10,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});
