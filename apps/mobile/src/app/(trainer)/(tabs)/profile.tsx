import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ACCESS_CODE_ROTATION_SECONDS, useMyClients, useRotatingAccessCode } from '@/hooks/use-gym-data';

// Misma identidad visual oscura que Acceso/Rutina.
const colors = Colors.dark;

export default function TrainerProfileScreen() {
  // El QR también es una llave de acceso física al gym para el entrenador —
  // se bloquean capturas/grabación igual que en el QR del cliente.
  if (Platform.OS !== 'web') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePreventScreenCapture('trainer-qr-profile');
  }

  const { profile, signOut } = useAuth();
  const { data: clients } = useMyClients(profile?.id);

  const {
    data: accessCode,
    isLoading: loadingCode,
    dataUpdatedAt,
  } = useRotatingAccessCode(profile?.id, 'trainer', !!profile?.id);

  const [secondsLeft, setSecondsLeft] = useState(ACCESS_CODE_ROTATION_SECONDS);

  useEffect(() => {
    if (!dataUpdatedAt) return;
    const tick = () => {
      const elapsed = Math.floor((Date.now() - dataUpdatedAt) / 1000);
      setSecondsLeft(Math.max(0, ACCESS_CODE_ROTATION_SECONDS - elapsed));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.name}>{profile?.full_name}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>ENTRENADOR</Text>
            </View>
            <Text style={styles.clientsCount}>
              {clients?.length ?? 0} cliente{clients?.length === 1 ? '' : 's'} asignado{clients?.length === 1 ? '' : 's'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Mi QR de acceso</Text>
          <View style={styles.qrCard}>
            <View style={styles.qrFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />

              <View style={styles.qrInner}>
                {loadingCode ? <ActivityIndicator color={colors.danger} /> : accessCode ? <QRCode value={accessCode.code} size={160} /> : null}
              </View>
            </View>

            <Text style={styles.qrCaption}>Escanea para entrar al gym</Text>
            {accessCode && (
              <View style={styles.rotationBadge}>
                <Text style={styles.rotationText}>Se renueva en {secondsLeft}s</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Sesión</Text>
          <Pressable style={({ pressed }) => [styles.menuGroup, pressed && styles.menuRowPressed]} onPress={signOut}>
            <Text style={styles.menuLabel}>Cerrar sesión</Text>
          </Pressable>

          <Text style={styles.version}>American Fitness App v1.0</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    padding: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  profileCard: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.four,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accentSoft,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '800',
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  roleBadge: {
    marginTop: Spacing.two,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Spacing.four,
  },
  roleBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  clientsCount: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.one,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: Spacing.two,
    marginBottom: -Spacing.one,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  qrFrame: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    backgroundColor: '#ffffff',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: colors.accent,
    zIndex: 1,
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  qrCaption: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rotationBadge: {
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Spacing.four,
  },
  rotationText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  menuRowPressed: {
    backgroundColor: colors.backgroundElement,
  },
  menuLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  version: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
