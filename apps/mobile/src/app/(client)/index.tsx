import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Gradients, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyAccessCode, useMyMember } from '@/hooks/use-gym-data';
import type { MemberStatus } from '@/types/database';

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: 'Suscripción activa',
  expiring_soon: 'Por vencer',
  temporary_access: 'Acceso temporal',
  expired: 'Suscripción vencida',
  blocked: 'Acceso bloqueado',
  pending_activation: 'Pendiente de pago',
  archived: 'Inactivo',
};

const ACCESS_ALLOWED_STATUSES: MemberStatus[] = ['active', 'expiring_soon', 'temporary_access'];

export default function ClientHomeScreen() {
  const { profile } = useAuth();
  const { data: member, isLoading: loadingMember } = useMyMember(profile?.id);
  const { data: accessCode, isLoading: loadingCode } = useMyAccessCode(member?.id);

  const isActive = !!member && ACCESS_ALLOWED_STATUSES.includes(member.status);

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SafeAreaView edges={['top']}>
          <ThemedText type="small" themeColor="textSecondary">
            Hola,
          </ThemedText>
          <ThemedText type="title" style={styles.greetingName}>
            {profile?.full_name ?? '...'}
          </ThemedText>
        </SafeAreaView>

        <LinearGradient
          colors={isActive ? Gradients.brand : Gradients.danger}
          style={[styles.qrCard, Shadows.floating]}>
          <View style={styles.statusBadgeRow}>
            <BlurView intensity={40} tint="light" style={styles.statusBadge}>
              <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
                {member ? STATUS_LABEL[member.status] : 'Suscripción inactiva'}
              </ThemedText>
            </BlurView>
          </View>

          <View style={styles.qrWrapper}>
            {loadingCode || loadingMember ? (
              <ActivityIndicator />
            ) : accessCode?.active && isActive ? (
              <QRCode value={accessCode.code} size={200} />
            ) : (
              <ThemedText type="small" style={styles.qrDisabledText}>
                Renueva tu suscripción para generar tu QR de acceso
              </ThemedText>
            )}
          </View>

          <ThemedText type="small" style={styles.qrHint}>
            Muestra este código en la entrada del gimnasio
          </ThemedText>
        </LinearGradient>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },
  greetingName: {
    marginTop: -Spacing.one,
  },
  qrCard: {
    borderRadius: Spacing.five,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
  },
  statusBadgeRow: {
    alignSelf: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.five,
    overflow: 'hidden',
  },
  qrWrapper: {
    backgroundColor: '#ffffff',
    padding: Spacing.four,
    borderRadius: Spacing.four,
    minHeight: 200,
    minWidth: 200,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  qrDisabledText: {
    color: '#333333',
    textAlign: 'center',
  },
  qrHint: {
    color: '#ffffffcc',
    textAlign: 'center',
  },
});
