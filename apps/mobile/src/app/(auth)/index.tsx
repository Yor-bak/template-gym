import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Gradients, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <LinearGradient colors={Gradients.brand} style={styles.hero}>
            <SafeAreaView edges={['top']}>
              <View style={styles.badge}>
                <View style={styles.badgeInner} />
              </View>
              <ThemedText type="title" style={styles.heroTitle}>
                GYM Access
              </ThemedText>
              <ThemedText type="default" style={styles.heroSubtitle}>
                Tu llave de acceso, rutinas y entrenador en un solo lugar.
              </ThemedText>
            </SafeAreaView>
          </LinearGradient>

          <Card style={[styles.formCard, Shadows.floating]}>
            <ThemedText type="subtitle">Inicia sesión</ThemedText>

            <TextField
              label="Correo electrónico"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tucorreo@ejemplo.com"
            />
            <TextField
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="••••••••"
            />

            {error && (
              <ThemedText themeColor="danger" type="small">
                {error}
              </ThemedText>
            )}

            <Button label="Entrar" onPress={handleSubmit} loading={loading} disabled={!email || !password} />

            <Link href="/(auth)/register" asChild>
              <ThemedText type="link" themeColor="textSecondary" style={styles.registerLink}>
                ¿No tienes cuenta? Regístrate
              </ThemedText>
            </Link>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingTop: Spacing.five,
    paddingBottom: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.three,
  },
  badgeInner: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#C8102E',
    transform: [{ rotate: '45deg' }],
  },
  heroTitle: {
    color: '#ffffff',
  },
  heroSubtitle: {
    color: '#D8E2F0',
    marginTop: Spacing.one,
  },
  formCard: {
    marginHorizontal: Spacing.four,
    marginTop: -Spacing.five,
    padding: Spacing.four,
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  registerLink: {
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
