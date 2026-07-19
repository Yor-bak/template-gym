import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Gradients, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyClients } from '@/hooks/use-gym-data';
import type { Member } from '@/types/database';

// Misma identidad visual oscura que Acceso/Perfil/Rutina — el acento azul
// (en vez del rojo del cliente) es el distintivo de la vista de entrenador.
const colors = Colors.dark;

export default function TrainerClientsScreen() {
  const { profile } = useAuth();
  const { data: clients, isLoading } = useMyClients(profile?.id);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.brandRow}>
          <View style={styles.brandMark} />
          <Text style={styles.brandWordmark}>AMERICAN FITNESS</Text>
        </View>

        <View style={styles.headerRow}>
          <Text style={styles.title}>Mis clientes</Text>
          <Pressable
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
            onPress={() => router.push('/(trainer)/scan-client')}>
            <Ionicons name="qr-code-outline" size={16} color={colors.text} />
            <Text style={styles.scanButtonText}>Escanear cliente</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : !clients?.length ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBadge}>
              <Ionicons name="people-outline" size={28} color={colors.accent} />
            </View>
            <Text style={styles.emptyTitle}>Todavía no tienes clientes asignados</Text>
            <Text style={styles.emptyHint}>
              Toca &quot;Escanear cliente&quot; y lee el QR de acceso que el cliente ve en su app para asignártelo.
            </Text>
          </View>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => <ClientRow client={item} />}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

function ClientRow({ client }: { client: Member }) {
  const fullName = `${client.first_name} ${client.last_name}`;
  return (
    <Pressable onPress={() => router.push(`/(trainer)/client/${client.id}`)}>
      {({ pressed }) => (
        <View style={[styles.row, pressed && styles.rowPressed]}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{client.first_name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowName}>{fullName}</Text>
            {client.phone && <Text style={styles.rowPhone}>{client.phone}</Text>}
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </View>
      )}
    </Pressable>
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
    gap: Spacing.three,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  brandMark: {
    width: 14,
    height: 14,
    borderRadius: 4,
    backgroundColor: colors.accent,
    transform: [{ rotate: '45deg' }],
  },
  brandWordmark: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  title: {
    color: colors.text,
    fontSize: 26,
    fontWeight: '700',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    backgroundColor: colors.accent,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  scanButtonPressed: {
    opacity: 0.8,
  },
  scanButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  loader: {
    marginTop: Spacing.five,
  },
  emptyState: {
    marginTop: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  emptyIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyHint: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.three,
  },
  rowPressed: {
    backgroundColor: colors.backgroundElement,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Gradients.brand[1],
  },
  avatarInitial: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rowPhone: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
