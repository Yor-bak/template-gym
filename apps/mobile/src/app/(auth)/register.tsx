import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Gradients, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';

// El registro desde la app es solo para clientes. Las cuentas de entrenador
// las crea el admin desde el dashboard web (vía la API de administración de
// Supabase), no hay auto-registro de entrenadores.
export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signUpError } = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      role: 'client',
    });
    setLoading(false);
    if (signUpError) {
      setError(signUpError);
      return;
    }
    router.replace('/(auth)');
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
              <ThemedText type="title" style={styles.heroTitle}>
                Crea tu cuenta
              </ThemedText>
              <ThemedText type="default" style={styles.heroSubtitle}>
                Regístrate como cliente del gym
              </ThemedText>
            </SafeAreaView>
          </LinearGradient>

          <Card style={[styles.formCard, Shadows.floating]}>
            <TextField label="Nombre completo" value={fullName} onChangeText={setFullName} placeholder="Tu nombre" />
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
              placeholder="Mínimo 6 caracteres"
            />

            {error && (
              <ThemedText themeColor="danger" type="small">
                {error}
              </ThemedText>
            )}

            <Button
              label="Registrarme"
              onPress={handleSubmit}
              loading={loading}
              disabled={!fullName || !email || password.length < 6}
            />
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
});
