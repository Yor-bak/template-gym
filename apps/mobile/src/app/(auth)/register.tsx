import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { mockDb } from '@/lib/mock-db';

// Mismo tema oscuro premium que el login.
const colors = Colors.dark;

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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLookupCode() {
    setError(null);
    setLoading(true);
    const data = mockDb.lookupActivationCode(code.trim().toUpperCase());
    setLoading(false);

    if (!data) {
      setError('Código de activación inválido o ya utilizado. Verifícalo con el gym.');
      return;
    }

    setMemberFirstName(data.first_name);
    setGymName(data.gym_name);
    setStep(2);
  }

  async function handleActivate() {
    setError(null);

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

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

  const step1Valid = code.trim().length >= 4;
  const step2Valid = !!email && password.length >= 6 && confirmPassword.length >= 6;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SafeAreaView edges={['top']} style={styles.heroBlock}>
            <Pressable onPress={() => (step === 2 ? setStep(1) : router.back())} hitSlop={12} style={styles.backButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>

            <Text style={styles.heroTitle}>{step === 1 ? 'Activa tu\ncuenta' : 'Crea tu\nacceso'}</Text>
            <Text style={styles.heroSubtitle}>
              {step === 1
                ? 'Ingresa el código que te dio el gym al inscribirte.'
                : `¡Hola ${memberFirstName}! Define cómo vas a entrar a ${gymName}.`}
            </Text>
          </SafeAreaView>

          <View style={styles.form}>
            {step === 1 ? (
              <>
                <View style={styles.field}>
                  <Ionicons name="key-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    value={code}
                    onChangeText={setCode}
                    autoCapitalize="characters"
                    placeholder="Ej. A1B2C3D4"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleLookupCode}
                  disabled={!step1Valid || loading}
                  style={({ pressed }) => [
                    styles.button,
                    { opacity: pressed ? 0.85 : !step1Valid || loading ? 0.5 : 1 },
                  ]}>
                  {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>CONTINUAR</Text>}
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.field}>
                  <Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="Correo electrónico"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                </View>

                <View style={styles.field}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Contraseña (mínimo 6 caracteres)"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={10}>
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={colors.textSecondary}
                    />
                  </Pressable>
                </View>

                <View style={styles.field}>
                  <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                    placeholder="Confirmar contraseña"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.input}
                  />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <Pressable
                  onPress={handleActivate}
                  disabled={!step2Valid || loading}
                  style={({ pressed }) => [
                    styles.button,
                    { opacity: pressed ? 0.85 : !step2Valid || loading ? 0.5 : 1 },
                  ]}>
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonText}>ACTIVAR CUENTA</Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => {
                    setStep(1);
                    setError(null);
                  }}>
                  <Text style={styles.backLink}>Usar otro código</Text>
                </Pressable>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingBottom: Spacing.five,
  },
  heroBlock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundElement,
    marginBottom: Spacing.two,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 40,
  },
  heroSubtitle: {
    color: colors.silver,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 320,
  },
  form: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 56,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: colors.backgroundElement,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '600',
  },
  button: {
    height: 56,
    borderRadius: Spacing.three,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.one,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },
  backLink: {
    color: colors.silver,
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
});
