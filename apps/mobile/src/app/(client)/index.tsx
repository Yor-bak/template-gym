import { usePreventScreenCapture } from 'expo-screen-capture';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { ACCESS_CODE_ROTATION_SECONDS, useMyMember, useRotatingAccessCode } from '@/hooks/use-gym-data';
import type { MemberStatus } from '@/types/database';

// Esta vista siempre usa el tema oscuro premium, sin importar el modo del
// sistema — es la tarjeta de acceso física del socio.
const colors = Colors.dark;

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Socio activo',
  expiring_soon: 'Por vencer',
  temporary_access: 'Acceso temporal',
  expired: 'Suscripción vencida',
  blocked: 'Acceso bloqueado',
  pending_activation: 'Pendiente de pago',
  archived: 'Inactivo',
};

const ACCESS_ALLOWED_STATUSES: MemberStatus[] = ['active', 'expiring_soon', 'temporary_access'];

export default function ClientHomeScreen() {
  // El QR es la llave de acceso física al gym: bloqueamos capturas de
  // pantalla y grabación solo en esta vista para que no se pueda compartir.
  usePreventScreenCapture('client-qr-home');

  const { profile } = useAuth();
  const { data: member, isLoading: loadingMember } = useMyMember(profile?.id);

  const isActive = !!member && ACCESS_ALLOWED_STATUSES.includes(member.status);

  const {
    data: accessCode,
    isLoading: loadingCode,
    dataUpdatedAt,
  } = useRotatingAccessCode(member?.id, isActive);

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

  const firstName = profile?.full_name?.split(' ')[0] ?? '';

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandWordmark}>AMERICAN FITNESS</Text>
        </View>

        <Text style={styles.greeting}>Hola, {firstName || '...'}</Text>
        <View style={[styles.statusPill, { backgroundColor: isActive ? '#1D3B24' : '#3B1D22' }]}>
          <View style={[styles.statusDot, { backgroundColor: isActive ? '#3DDC6B' : colors.danger }]} />
          <Text style={[styles.statusPillText, { color: isActive ? '#3DDC6B' : colors.danger }]}>
            {member ? STATUS_LABEL[member.status].toUpperCase() : 'SIN DATOS'}
          </Text>
        </View>

        <View style={styles.qrCard}>
          <View style={styles.qrFrame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            <View style={styles.qrInner}>
              {loadingCode || loadingMember ? (
                <ActivityIndicator color={colors.danger} />
              ) : accessCode?.active && isActive ? (
                <QRCode value={accessCode.code} size={200} />
              ) : (
                <Text style={styles.qrDisabledText}>Renueva tu suscripción para generar tu QR de acceso</Text>
              )}
            </View>
          </View>

          <Text style={styles.qrCaption}>Escanea para entrar</Text>
          <Text style={styles.qrHint}>Asegúrate de que el brillo de tu pantalla esté al máximo para un escaneo rápido.</Text>

          {isActive && accessCode && (
            <View style={styles.rotationBadge}>
              <Text style={styles.rotationText}>Se renueva en {secondsLeft}s</Text>
            </View>
          )}
        </View>
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
    padding: Spacing.four,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  brandMark: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.danger,
    transform: [{ rotate: '45deg' }],
  },
  brandWordmark: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  greeting: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: 6,
    borderRadius: Spacing.four,
    marginBottom: Spacing.three,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  qrCard: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.five,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  qrFrame: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 280,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrInner: {
    backgroundColor: '#ffffff',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: colors.danger,
    zIndex: 1,
  },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 8 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 8 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 8 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 8 },
  qrDisabledText: {
    color: '#333333',
    textAlign: 'center',
    fontSize: 14,
  },
  qrCaption: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: Spacing.two,
  },
  qrHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  rotationBadge: {
    backgroundColor: colors.backgroundElement,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Spacing.four,
  },
  rotationText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
