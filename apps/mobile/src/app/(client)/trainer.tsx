import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Gradients, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyTrainer } from '@/hooks/use-gym-data';

export default function ClientTrainerScreen() {
  const { profile } = useAuth();
  const { data: trainer, isLoading } = useMyTrainer(profile?.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedText type="title">Mi entrenador</ThemedText>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : !trainer ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Aún no tienes un entrenador asignado. Contacta al gym si quieres contratar uno para tener una
            rutina personalizada.
          </ThemedText>
        ) : (
          <Card style={styles.card}>
            <LinearGradient colors={Gradients.brand} style={styles.avatarPlaceholder}>
              <ThemedText type="title" style={styles.avatarInitial}>
                {trainer.full_name.charAt(0).toUpperCase()}
              </ThemedText>
            </LinearGradient>
            <ThemedText type="subtitle">{trainer.full_name}</ThemedText>
            {trainer.phone && (
              <ThemedText themeColor="textSecondary" type="small">
                {trainer.phone}
              </ThemedText>
            )}
          </Card>
        )}
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
    gap: Spacing.three,
  },
  loader: {
    marginTop: Spacing.five,
  },
  empty: {
    marginTop: Spacing.three,
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
