import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
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

// Login siempre en tema oscuro premium, igual que la vista de socio.
const colors = Colors.dark;

// Foto de fondo del login. Para usar la foto real de American Fitness,
// reemplaza esta URL por un require('...') de un archivo local en
// assets/images, p. ej. require('@/../assets/images/gym-hero.jpg').
const HERO_IMAGE = 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1080&auto=format&fit=crop';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(phone.trim(), password);
    setLoading(false);
    if (signInError) setError(signInError);
  }

  const canSubmit = !!phone && !!password && !loading;

  return (
    <View style={styles.container}>
      {/* Foto de fondo + veladura oscura para legibilidad */}
      <Image source={HERO_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} />
      <LinearGradient
        colors={['rgba(5,7,12,0.55)', 'rgba(5,7,12,0.85)', colors.background]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <SafeAreaView edges={['top']} style={styles.brandBlock}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark} />
              <Text style={styles.brandWordmark}>AMERICAN FITNESS</Text>
            </View>
            <Text style={styles.heroTitle}>Entrena{'\n'}sin límites.</Text>
            <Text style={styles.heroSubtitle}>Tu llave de acceso, rutinas y entrenador, en un solo lugar.</Text>
          </SafeAreaView>

          <View style={styles.form}>
            <View style={styles.field}>
              <Ionicons name="call-outline" size={20} color={colors.textSecondary} />
              <TextInput
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="Número de teléfono"
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
                placeholder="Contraseña"
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
                <Text style={styles.buttonText}>ENTRAR</Text>
              )}
            </Pressable>

            <Text style={styles.helperText}>
              ¿Aún no tienes cuenta? Pídele a recepción que te registre.
            </Text>
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
    justifyContent: 'space-between',
    paddingBottom: Spacing.five,
  },
  brandBlock: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.five,
    gap: Spacing.two,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: colors.danger,
    transform: [{ rotate: '45deg' }],
  },
  brandWordmark: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 40,
    fontWeight: '800',
    lineHeight: 44,
    marginTop: Spacing.three,
  },
  heroSubtitle: {
    color: colors.silver,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 300,
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
    backgroundColor: 'rgba(20,25,34,0.75)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
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
