import React, { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useAppTheme } from '@/theme/ThemeProvider';
import { LikeButton, DoubleTapHeart } from './LikeButton';
import { toggleLike } from '@/services/likesApi';

interface FeedCardProps {
  shareId: string;
  ownerId: string;
  ownerUsername: string;
  workoutTitle: string;
  exerciseCount: number;
  setCount: number;
  createdAt: string;
  initialLiked?: boolean;
  initialLikeCount?: number;
  currentUserId: string;
  onProfilePress?: () => void;
  onDuplicate?: () => void;
  onCommentPress?: () => void;
}

export const FeedCard: React.FC<FeedCardProps> = ({
  shareId,
  ownerId,
  ownerUsername,
  workoutTitle,
  exerciseCount,
  setCount,
  createdAt,
  initialLiked = false,
  initialLikeCount = 0,
  currentUserId,
  onProfilePress,
  onDuplicate,
  onCommentPress,
}) => {
  const { theme } = useAppTheme();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);
  const lastTapRef = useRef<number>(0);
  const cardScaleAnim = useRef(new Animated.Value(1)).current;

  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
  });

  // Gestion du double-tap
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;

    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap détecté!
      if (!liked) {
        handleLike();
        setShowDoubleTapHeart(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    }
    lastTapRef.current = now;
  }, [liked]);

  const handleLike = async () => {
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((prev) => (wasLiked ? prev - 1 : prev + 1));

    try {
      const response = await toggleLike(shareId, currentUserId);
      setLiked(response.liked);
      setLikeCount(response.like_count);
    } catch (error) {
      // Rollback on error
      setLiked(wasLiked);
      setLikeCount((prev) => (wasLiked ? prev + 1 : prev - 1));
    }
  };

  return (
    <Pressable onPress={handleDoubleTap}>
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            transform: [{ scale: cardScaleAnim }],
          },
        ]}
      >
        {/* Double tap heart animation */}
        <DoubleTapHeart
          visible={showDoubleTapHeart}
          onAnimationEnd={() => setShowDoubleTapHeart(false)}
        />

        {/* Header - Avatar & Username */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.userInfo} onPress={onProfilePress}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.accent + '20' }]}>
              <Text style={[styles.avatarText, { color: theme.colors.accent }]}>
                {ownerUsername.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View>
              <Text style={[styles.username, { color: theme.colors.textPrimary }]}>
                {ownerUsername}
              </Text>
              <Text style={[styles.date, { color: theme.colors.textSecondary }]}>
                {formattedDate}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Content - Workout preview */}
        <View style={[styles.workoutPreview, { backgroundColor: theme.colors.surfaceMuted }]}>
          <View style={styles.workoutIcon}>
            <Ionicons name="barbell" size={32} color={theme.colors.accent} />
          </View>
          <View style={styles.workoutInfo}>
            <Text style={[styles.workoutTitle, { color: theme.colors.textPrimary }]} numberOfLines={2}>
              {workoutTitle}
            </Text>
            <View style={styles.workoutStats}>
              <View style={styles.stat}>
                <Ionicons name="fitness" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {exerciseCount} exercices
                </Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="layers" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                  {setCount} séries
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Actions - Like, Comment, Save */}
        <View style={styles.actions}>
          <View style={styles.leftActions}>
            <LikeButton liked={liked} likeCount={likeCount} onToggle={handleLike} />
            <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
              <Ionicons name="chatbubble-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Ionicons name="paper-plane-outline" size={22} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: theme.colors.accent }]}
            onPress={onDuplicate}
          >
            <Ionicons name="bookmark-outline" size={16} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          </TouchableOpacity>
        </View>

        {/* Like count text */}
        {likeCount > 0 && (
          <Text style={[styles.likeCountText, { color: theme.colors.textPrimary }]}>
            {likeCount} J'aime{likeCount > 1 ? 's' : ''}
          </Text>
        )}

        {/* Caption */}
        <View style={styles.caption}>
          <Text style={{ color: theme.colors.textPrimary }}>
            <Text style={styles.captionUsername}>{ownerUsername}</Text>
            {' '}a partagé sa séance 💪
          </Text>
        </View>

        {/* View comments link */}
        <TouchableOpacity onPress={onCommentPress}>
          <Text style={[styles.viewComments, { color: theme.colors.textSecondary }]}>
            Voir les commentaires
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
  },
  date: {
    fontSize: 12,
  },
  moreButton: {
    padding: 4,
  },
  workoutPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    marginHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  workoutIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  workoutInfo: {
    flex: 1,
    gap: 6,
  },
  workoutTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  workoutStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButton: {
    padding: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  likeCountText: {
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  caption: {
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  captionUsername: {
    fontWeight: '700',
  },
  viewComments: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
});

