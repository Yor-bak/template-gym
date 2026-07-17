import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Gradients, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyClients } from '@/hooks/use-gym-data';
import type { Member } from '@/types/database';

// Misma identidad visual oscura que Acceso/Perfil/Rutina.
const colors = Colors.dark;

export default function TrainerClientsScreen() {
  const { profile } = useAuth();
  const { data: clients, isLoading } = useMyClients(profile?.id);

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Mis clientes</Text>
          <Pressable
            style={({ pressed }) => [styles.scanButton, pressed && styles.scanButtonPressed]}
            onPress={() => router.push('/(trainer)/scan-client')}>
            <Text style={styles.scanButtonIcon}>▢</Text>
            <Text style={styles.scanButtonText}>Escanear cliente</Text>
          </Pressable>
        </View>

        {isLoading ? (
          <ActivityIndicator color={colors.accent} style={styles.loader} />
        ) : !clients?.length ? (
          <View style={styles.emptyState}>
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
          <Text style={styles.chevron}>›</Text>
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
  scanButtonIcon: {
    color: colors.text,
    fontSize: 13,
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
  chevron: {
    color: colors.textSecondary,
    fontSize: 20,
  },
});
