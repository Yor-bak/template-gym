import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Gradients, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import type { UserRole } from '@/types/database';

const ROLE_LABEL: Record<UserRole, string> = {
  client: 'Cliente',
  trainer: 'Entrenador',
  admin: 'Administrador',
  receptionist: 'Recepción',
  platform_admin: 'Admin de plataforma',
};

export function ProfileScreen() {
  const { profile, signOut } = useAuth();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedText type="title">Mi perfil</ThemedText>

        <Card style={styles.card}>
          <LinearGradient colors={Gradients.brand} style={styles.avatarPlaceholder}>
            <ThemedText type="title" style={styles.avatarInitial}>
              {profile?.full_name?.charAt(0).toUpperCase() ?? '?'}
            </ThemedText>
          </LinearGradient>
          <ThemedText type="subtitle">{profile?.full_name}</ThemedText>
          {profile && (
            <ThemedText themeColor="accent" type="smallBold">
              {ROLE_LABEL[profile.role]}
            </ThemedText>
          )}
          {profile?.phone && (
            <ThemedText themeColor="textSecondary" type="small">
              {profile.phone}
            </ThemedText>
          )}
        </Card>

        <Button label="Cerrar sesión" variant="secondary" onPress={signOut} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    padding: Spacing.four,
    gap: Spacing.four,
  },
  card: {
    padding: Spacing.five,
    alignItems: 'center',
    gap: Spacing.two,
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  avatarInitial: {
    color: '#ffffff',
  },
});
