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
import { supabase } from '@/lib/supabase';

// La cuenta de cliente no se auto-registra: el staff da de alta al miembro en
// recepción y le entrega un código de activación de 8 caracteres. Aquí solo
// se valida ese código (paso 1) y se define correo/contraseña (paso 2).
export default function ActivateAccountScreen() {
  const { activateAccount } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [memberFirstName, setMemberFirstName] = useState('');
  const [gymName, setGymName] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookupCode() {
    setError(null);
    setLoading(true);
    const { data, error: lookupError } = await supabase
      .rpc('lookup_activation_code', { p_code: code.trim().toUpperCase() })
      .maybeSingle<{ first_name: string; gym_name: string }>();
    setLoading(false);

    if (lookupError || !data) {
      setError('Código de activación inválido o ya utilizado. Verifícalo con el gym.');
      return;
    }

    setMemberFirstName(data.first_name);
    setGymName(data.gym_name);
    setStep(2);
  }

  async function handleActivate() {
    setError(null);
    setLoading(true);
    const { error: activateError } = await activateAccount({
      email: email.trim(),
      password,
      activationCode: code.trim().toUpperCase(),
    });
    setLoading(false);
    if (activateError) {
      setError(activateError);
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
                Activa tu cuenta
              </ThemedText>
              <ThemedText type="default" style={styles.heroSubtitle}>
                {step === 1
                  ? 'Ingresa el código que te dio el gym al inscribirte'
                  : `¡Hola ${memberFirstName}! Activa tu cuenta en ${gymName}`}
              </ThemedText>
            </SafeAreaView>
          </LinearGradient>

          <Card style={[styles.formCard, Shadows.floating]}>
            {step === 1 ? (
              <>
                <TextField
                  label="Código de activación"
                  value={code}
                  onChangeText={setCode}
                  autoCapitalize="characters"
                  placeholder="Ej. A1B2C3D4"
                />
                {error && (
                  <ThemedText themeColor="danger" type="small">
                    {error}
                  </ThemedText>
                )}
                <Button
                  label="Continuar"
                  onPress={handleLookupCode}
                  loading={loading}
                  disabled={code.trim().length < 4}
                />
              </>
            ) : (
              <>
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
                  label="Activar cuenta"
                  onPress={handleActivate}
                  loading={loading}
                  disabled={!email || password.length < 6}
                />
                <ThemedText
                  type="link"
                  themeColor="textSecondary"
                  style={styles.backLink}
                  onPress={() => {
                    setStep(1);
                    setError(null);
                  }}>
                  Usar otro código
                </ThemedText>
              </>
            )}
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
  backLink: {
    textAlign: 'center',
    marginTop: Spacing.one,
  },
});
