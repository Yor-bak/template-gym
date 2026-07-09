import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Gradients, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyClients } from '@/hooks/use-gym-data';
import type { Member } from '@/types/database';

export default function TrainerClientsScreen() {
  const { profile } = useAuth();
  const { data: clients, isLoading } = useMyClients(profile?.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedText type="title" style={styles.title}>
          Mis clientes
        </ThemedText>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : !clients?.length ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Todavía no tienes clientes asignados.
          </ThemedText>
        ) : (
          <FlatList
            data={clients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <ClientRow client={item} />}
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

function ClientRow({ client }: { client: Member }) {
  const fullName = `${client.first_name} ${client.last_name}`;
  return (
    <Pressable onPress={() => router.push(`/(trainer)/client/${client.id}`)}>
      {({ pressed }) => (
        <Card elevated={false} style={[styles.row, { opacity: pressed ? 0.7 : 1 }]}>
          <LinearGradient colors={Gradients.brand} style={styles.avatarPlaceholder}>
            <ThemedText type="smallBold" style={styles.avatarInitial}>
              {client.first_name.charAt(0).toUpperCase()}
            </ThemedText>
          </LinearGradient>
          <View style={styles.rowText}>
            <ThemedText type="smallBold">{fullName}</ThemedText>
            {client.phone && (
              <ThemedText themeColor="textSecondary" type="small">
                {client.phone}
              </ThemedText>
            )}
          </View>
          <ThemedText themeColor="textSecondary">›</ThemedText>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    marginBottom: Spacing.one,
  },
  loader: {
    marginTop: Spacing.five,
  },
  empty: {
    marginTop: Spacing.three,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
});
