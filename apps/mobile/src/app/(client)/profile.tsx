import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyMember, useMyTrainer } from '@/hooks/use-gym-data';
import type { MemberStatus } from '@/types/database';

// Misma identidad visual oscura que Acceso y Rutina.
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

function MenuRow({ label, value, onPress }: { label: string; value?: string; onPress?: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && onPress && styles.menuRowPressed]} onPress={onPress}>
      <Text style={styles.menuLabel}>{label}</Text>
      <View style={styles.menuRight}>
        {value && <Text style={styles.menuValue}>{value}</Text>}
        {onPress && <Text style={styles.menuChevron}>›</Text>}
      </View>
    </Pressable>
  );
}

export default function ClientSettingsScreen() {
  const { profile, signOut } = useAuth();
  const { data: member } = useMyMember(profile?.id);
  const { data: trainer } = useMyTrainer(member?.id);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitial}>{profile?.full_name?.charAt(0).toUpperCase() ?? '?'}</Text>
            </View>
            <Text style={styles.name}>{profile?.full_name}</Text>
            {profile?.phone && <Text style={styles.phone}>{profile.phone}</Text>}
            {member && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{STATUS_LABEL[member.status].toUpperCase()}</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Cuenta</Text>
          <View style={styles.menuGroup}>
            <MenuRow label="Membresía" value={member?.expiration_date ? `Vence ${member.expiration_date}` : undefined} />
            <MenuRow
              label="Mi entrenador"
              value={trainer?.full_name ?? 'Sin asignar'}
              onPress={trainer ? () => router.push('/(client)/trainer') : undefined}
            />
          </View>

          <Text style={styles.sectionLabel}>Sesión</Text>
          <View style={styles.menuGroup}>
            <MenuRow label="Cerrar sesión" onPress={signOut} />
          </View>

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
    borderColor: colors.danger,
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
  phone: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  badge: {
    marginTop: Spacing.two,
    backgroundColor: '#1D3B24',
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
    borderRadius: Spacing.four,
  },
  badgeText: {
    color: '#3DDC6B',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
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
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  menuRowPressed: {
    backgroundColor: colors.backgroundElement,
  },
  menuLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  menuRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  menuValue: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  menuChevron: {
    color: colors.textSecondary,
    fontSize: 18,
  },
  version: {
    color: colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
    marginTop: Spacing.three,
  },
});
