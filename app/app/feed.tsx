import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useFeed } from '@/hooks/useFeed';
import { useAppTheme } from '@/theme/ThemeProvider';
import { StoriesCarousel } from '@/components/StoriesCarousel';
import { FeedCard } from '@/components/FeedCard';
import { fetchStories } from '@/services/storiesApi';
import { getComments, addComment, Comment } from '@/services/likesApi';

const CURRENT_USER_ID = 'guest-user'; // TODO: récupérer depuis useAuth

const FeedScreen: React.FC = () => {
  const { items, load, nextCursor, isLoading, error, toggleFollow, duplicate } = useFeed();
  const { theme } = useAppTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentStory, setCurrentStory] = useState<any | null>(null);
  const [progress, setProgress] = useState(new Animated.Value(0));
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Comments modal state
  const [commentsModal, setCommentsModal] = useState<{
    visible: boolean;
    shareId: string | null;
    comments: Comment[];
    loading: boolean;
  }>({
    visible: false,
    shareId: null,
    comments: [],
    loading: false,
  });
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  useEffect(() => {
    const fallbackStories = [
      {
        id: 'st-fb-1',
        title: 'Recette post-workout',
        username: 'CoachBot',
        avatar:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=200&q=80',
        media:
          'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        link: 'https://www.allrecipes.com/recipe/24074/black-bean-and-corn-salad-ii/',
      },
      {
        id: 'st-fb-2',
        title: 'Routine mobilité',
        username: 'CoachBot',
        avatar:
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=200&q=80',
        media:
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80',
        link: 'https://www.youtube.com/results?search_query=mobility+routine',
      },
      {
        id: 'st-fb-3',
        title: 'Astuce récup',
        username: 'CoachBot',
        avatar:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
        media:
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=800&q=80',
        link: 'https://www.healthline.com/nutrition/post-workout-recovery',
      },
    ];

    setLoadingStories(true);
    fetchStories()
      .then((data) => {
        const mapped = (data || []).map((s) => ({
          id: String(s.id),
          title: s.title,
          username: s.owner_username,
          avatar: s.media_url,
          media: s.media_url,
          link: s.link,
        }));
        setStories(mapped.length ? mapped : fallbackStories);
      })
      .catch(() => {
        setStories(fallbackStories);
      })
      .finally(() => setLoadingStories(false));
  }, []);

  const openStory = (story: any) => {
    setCurrentStory(story);
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 5000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        setCurrentStory(null);
      }
    });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCurrentStory(null), 5000);
  };

  const openLink = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (err) {
      // Ignore
    }
  };

  useEffect(() => {
    load(true).catch(() => undefined);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await load(true);
    } finally {
      setRefreshing(false);
    }
  };

  // Comments handling
  const openComments = async (shareId: string) => {
    setCommentsModal({ visible: true, shareId, comments: [], loading: true });
    try {
      const response = await getComments(shareId);
      setCommentsModal((prev) => ({ ...prev, comments: response.comments, loading: false }));
    } catch (error) {
      setCommentsModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim() || !commentsModal.shareId || postingComment) return;
    
    setPostingComment(true);
    try {
      const comment = await addComment(commentsModal.shareId, CURRENT_USER_ID, newComment.trim());
      setCommentsModal((prev) => ({
        ...prev,
        comments: [comment, ...prev.comments],
      }));
      setNewComment('');
    } catch (error) {
      // Handle error
    } finally {
      setPostingComment(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <FeedCard
      shareId={item.share_id}
      ownerId={item.owner_id}
      ownerUsername={item.owner_username}
      workoutTitle={item.workout_title}
      exerciseCount={item.exercise_count}
      setCount={item.set_count}
      createdAt={item.created_at}
      currentUserId={CURRENT_USER_ID}
      onProfilePress={() => router.push(`/profile/${item.owner_id}`)}
      onDuplicate={() => duplicate(item.share_id)}
      onCommentPress={() => openComments(item.share_id)}
    />
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      {/* Header Instagram-style */}
      <View style={styles.header}>
        <Text style={[styles.logo, { color: theme.colors.textPrimary }]}>Gorillax</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/leaderboard')}
          >
            <Ionicons name="trophy-outline" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/notifications')}
          >
            <Ionicons name="heart-outline" size={26} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => router.push('/explore')}
          >
            <Ionicons name="search-outline" size={24} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stories */}
      {loadingStories ? (
        <View style={styles.storyLoader}>
          <ActivityIndicator />
        </View>
      ) : (
        <StoriesCarousel stories={stories} onOpen={openStory} />
      )}

      {/* Feed */}
      {isLoading && !items.length ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" />
          <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
            Chargement du feed...
          </Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.colors.textPrimary }]}>
            Ton feed est vide
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.colors.textSecondary }]}>
            Suis d'autres utilisateurs pour voir leurs séances ici
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.share_id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.accent}
            />
          }
          ListFooterComponent={
            nextCursor ? (
              <TouchableOpacity
                style={[styles.loadMore, { borderColor: theme.colors.border }]}
                onPress={() => load(false)}
              >
                <Text style={{ color: theme.colors.textSecondary }}>Charger plus</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}

      {error ? (
        <Text style={[styles.error, { color: theme.colors.error }]}>{error}</Text>
      ) : null}

      {/* Story Modal */}
      <Modal
        visible={!!currentStory}
        transparent
        animationType="fade"
        onRequestClose={() => setCurrentStory(null)}
      >
        <TouchableWithoutFeedback onPress={() => setCurrentStory(null)}>
          <View style={styles.modalBackdrop} />
        </TouchableWithoutFeedback>
        {currentStory && (
          <View style={[styles.storyModal, { backgroundColor: theme.colors.surface }]}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  backgroundColor: theme.colors.accent,
                  width: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
            <Text style={[styles.storyTitle, { color: theme.colors.textPrimary }]}>
              {currentStory.title}
            </Text>
            <Text style={[styles.storySubtitle, { color: theme.colors.textSecondary }]}>
              {currentStory.username}
            </Text>
            <View style={[styles.storyMedia, { borderColor: theme.colors.border }]}>
              <Ionicons name="image" size={48} color={theme.colors.textSecondary} />
            </View>
            <TouchableOpacity
              style={[styles.storyCta, { backgroundColor: theme.colors.accent }]}
              onPress={() => currentStory?.link && openLink(currentStory.link)}
            >
              <Text style={styles.storyCtaText}>Voir plus</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      {/* Comments Modal */}
      <Modal
        visible={commentsModal.visible}
        animationType="slide"
        onRequestClose={() => setCommentsModal((prev) => ({ ...prev, visible: false }))}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.commentsModal, { backgroundColor: theme.colors.background }]}
        >
          {/* Comments Header */}
          <View style={[styles.commentsHeader, { borderColor: theme.colors.border }]}>
            <Text style={[styles.commentsTitle, { color: theme.colors.textPrimary }]}>
              Commentaires
            </Text>
            <TouchableOpacity
              onPress={() => setCommentsModal((prev) => ({ ...prev, visible: false }))}
            >
              <Ionicons name="close" size={28} color={theme.colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {commentsModal.loading ? (
            <View style={styles.centered}>
              <ActivityIndicator />
            </View>
          ) : commentsModal.comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={[styles.noCommentsText, { color: theme.colors.textSecondary }]}>
                Aucun commentaire. Sois le premier !
              </Text>
            </View>
          ) : (
            <FlatList
              data={commentsModal.comments}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <View style={[styles.commentAvatar, { backgroundColor: theme.colors.surfaceMuted }]}>
                    <Text style={[styles.commentAvatarText, { color: theme.colors.textPrimary }]}>
                      {item.username.slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.commentContent}>
                    <Text style={{ color: theme.colors.textPrimary }}>
                      <Text style={styles.commentUsername}>{item.username}</Text>
                      {' '}{item.content}
                    </Text>
                    <Text style={[styles.commentDate, { color: theme.colors.textSecondary }]}>
                      {new Date(item.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Comment Input */}
          <View style={[styles.commentInputContainer, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
            <TextInput
              style={[styles.commentInput, { color: theme.colors.textPrimary }]}
              placeholder="Ajouter un commentaire..."
              placeholderTextColor={theme.colors.textSecondary}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity
              onPress={handlePostComment}
              disabled={!newComment.trim() || postingComment}
              style={{ opacity: newComment.trim() ? 1 : 0.5 }}
            >
              {postingComment ? (
                <ActivityIndicator size="small" color={theme.colors.accent} />
              ) : (
                <Text style={[styles.postButton, { color: theme.colors.accent }]}>Publier</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default FeedScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logo: {
    fontSize: 26,
    fontWeight: '800',
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMore: {
    padding: 16,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  error: {
    textAlign: 'center',
    padding: 16,
  },
  storyLoader: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
  },
  storyModal: {
    position: 'absolute',
    top: 100,
    left: 16,
    right: 16,
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  progressBar: {
    height: 3,
    borderRadius: 3,
  },
  storyTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  storySubtitle: {
    fontSize: 14,
  },
  storyMedia: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyCta: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  storyCtaText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  // Comments Modal
  commentsModal: {
    flex: 1,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  noComments: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noCommentsText: {
    fontSize: 14,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commentContent: {
    flex: 1,
    gap: 4,
  },
  commentUsername: {
    fontWeight: '700',
  },
  commentDate: {
    fontSize: 12,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  commentInput: {
    flex: 1,
    fontSize: 15,
    maxHeight: 80,
  },
  postButton: {
    fontWeight: '700',
    fontSize: 15,
  },
});
