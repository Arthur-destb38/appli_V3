import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/theme/ThemeProvider';

interface HeroSectionProps {
  username?: string;
  streak: number;
  nextWorkoutTitle?: string;
  onStartWorkout: () => void;
  onOpenMenu: () => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

const getMotivationalMessage = (streak: number, hasNextWorkout: boolean) => {
  if (streak >= 7) return "Tu es en feu ! Continue comme ça 💪";
  if (streak >= 3) return "Belle série ! Ne lâche rien 🔥";
  if (hasNextWorkout) return "Ta séance t'attend !";
  return "Prêt à te dépasser ?";
};

export const HeroSection: React.FC<HeroSectionProps> = ({
  username = 'Champion',
  streak,
  nextWorkoutTitle,
  onStartWorkout,
  onOpenMenu,
}) => {
  const { theme } = useAppTheme();
  const fireAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation du feu en boucle
    if (streak > 0) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fireAnim, {
            toValue: 1.15,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fireAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [streak]);

  const greeting = getGreeting();
  const motivationalMessage = getMotivationalMessage(streak, !!nextWorkoutTitle);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            {
              translateY: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <LinearGradient
        colors={
          theme.dark
            ? ['#1a1a2e', '#16213e', '#0f0f23']
            : ['#667eea', '#764ba2', '#f093fb']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header row */}
        <View style={styles.headerRow}>
          {streak > 0 && (
            <Animated.View
              style={[
                styles.streakBadge,
                { transform: [{ scale: fireAnim }] },
              ]}
            >
              <Text style={styles.streakFire}>🔥</Text>
              <Text style={styles.streakNumber}>{streak}</Text>
            </Animated.View>
          )}
          <TouchableOpacity onPress={onOpenMenu} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main content */}
        <View style={styles.content}>
          <Text style={styles.greeting}>{greeting},</Text>
          <Text style={styles.username}>{username} !</Text>
          <Text style={styles.motivational}>{motivationalMessage}</Text>

          {nextWorkoutTitle && (
            <View style={styles.nextWorkoutPreview}>
              <Ionicons name="barbell-outline" size={16} color="rgba(255,255,255,0.8)" />
              <Text style={styles.nextWorkoutText}>{nextWorkoutTitle}</Text>
            </View>
          )}
        </View>

        {/* CTA Button */}
        <TouchableOpacity style={styles.ctaButton} onPress={onStartWorkout} activeOpacity={0.8}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a24']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.ctaGradient}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.ctaText}>
              {nextWorkoutTitle ? 'Lancer la séance' : 'Nouvelle séance'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Decorative elements - pointerEvents none pour ne pas bloquer les touches */}
        <View style={styles.decorCircle1} pointerEvents="none" />
        <View style={styles.decorCircle2} pointerEvents="none" />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 20,
  },
  gradient: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    zIndex: 10,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  streakFire: {
    fontSize: 18,
  },
  streakNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  username: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '800',
    marginTop: 2,
    letterSpacing: -0.5,
  },
  motivational: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
  },
  nextWorkoutPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  nextWorkoutText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButton: {
    alignSelf: 'stretch',
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
});

