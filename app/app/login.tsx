import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/theme/ThemeProvider';

export default function LoginScreen() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  const { theme } = useAppTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirection automatique si déjà authentifié
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      console.log('User already authenticated, redirecting to home...');
      router.replace('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      console.log('Login attempt:', username.trim());
      await login({ username: username.trim(), password });
      console.log('Login successful, waiting for redirect...');
      // La redirection se fera automatiquement via le useEffect ci-dessus
    } catch (error) {
      console.error('Login failed:', error);
      Alert.alert(
        'Erreur de connexion',
        error instanceof Error ? error.message : 'Nom d\'utilisateur ou mot de passe incorrect'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>🦍 Gorillax</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>Connecte-toi pour continuer</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Nom d'utilisateur</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Entrez votre nom d'utilisateur"
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.colors.textPrimary }]}>Mot de passe</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.colors.surface, color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Entrez votre mot de passe"
              placeholderTextColor={theme.colors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.accent }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkButton}
            onPress={() => router.push('/register')}
            disabled={loading}
          >
            <Text style={[styles.linkText, { color: theme.colors.accent }]}>
              Pas encore de compte ? S'inscrire
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  form: {
    width: '100%',
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    borderWidth: 1,
  },
  button: {
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

