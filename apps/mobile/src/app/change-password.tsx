import { Ionicons } from '@expo/vector-icons';
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

const colors = Colors.dark;

// La recepción registra al cliente con una contraseña provisional. Esta
// pantalla es obligatoria en el primer ingreso — no se puede saltar ni hay
// forma de navegar fuera de ella hasta que la cambie (ver el guard en
// app/_layout.tsx: mustChangePassword bloquea (client)/(trainer)).
export default function ChangePasswordScreen() {
  const { profile, changePassword, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    const { error: changeError } = await changePassword(password);
    setLoading(false);
    if (changeError) setError(changeError);
  }

  const canSubmit = password.length >= 6 && confirmPassword.length >= 6 && !loading;

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SafeAreaView edges={['top']} style={styles.heroBlock}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={28} color={colors.danger} />
            </View>
            <Text style={styles.heroTitle}>Crea tu{'\n'}contraseña</Text>
            <Text style={styles.heroSubtitle}>
              {profile ? `¡Hola ${profile.full_name.split(' ')[0]}! ` : ''}
              Por seguridad, cambia la contraseña provisional que te dio recepción antes de continuar.
            </Text>
          </SafeAreaView>

          <View style={styles.form}>
            <View style={styles.field}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholder="Nueva contraseña (mínimo 6 caracteres)"
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
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                { opacity: pressed ? 0.85 : canSubmit ? 1 : 0.5 },
              ]}>
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>GUARDAR Y CONTINUAR</Text>
              )}
            </Pressable>

            <Pressable onPress={signOut}>
              <Text style={styles.helperText}>Cerrar sesión</Text>
            </Pressable>
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
    paddingTop: Spacing.five,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.backgroundElement,
    alignItems: 'center',
    justifyContent: 'center',
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
  helperText: {
    color: colors.silver,
    fontSize: 13,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
});
