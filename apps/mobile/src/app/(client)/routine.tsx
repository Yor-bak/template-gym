import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyRoutine } from '@/hooks/use-gym-data';
import { useTheme } from '@/hooks/use-theme';

export default function ClientRoutineScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const { data: routine, isLoading } = useMyRoutine(profile?.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ThemedText type="title">Mi rutina</ThemedText>

        {isLoading ? (
          <ActivityIndicator style={styles.loader} />
        ) : !routine ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            Aún no hay una rutina disponible. Cuando tu entrenador te asigne una, o el gym publique
            rutinas genéricas, aparecerán aquí.
          </ThemedText>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <ThemedText type="subtitle">{routine.title}</ThemedText>
              {routine.goal && (
                <ThemedText themeColor="accent" type="smallBold">
                  {routine.goal}
                </ThemedText>
              )}
              <ThemedText themeColor="textSecondary" type="small">
                {routine.client_id ? 'Personalizada por tu entrenador' : 'Rutina genérica'}
              </ThemedText>
            </View>

            {[...routine.routine_exercises]
              .sort((a, b) => a.order_index - b.order_index)
              .map((exercise) => (
                <Card
                  key={exercise.id}
                  style={[styles.exerciseCard, { borderLeftWidth: 3, borderLeftColor: theme.accent }]}>
                  <ThemedText type="smallBold">{exercise.name}</ThemedText>
                  <View style={styles.exerciseMetaRow}>
                    <ThemedText themeColor="textSecondary" type="small">
                      {exercise.sets} series × {exercise.reps} reps
                    </ThemedText>
                    {exercise.rest_seconds != null && (
                      <ThemedText themeColor="textSecondary" type="small">
                        Descanso {exercise.rest_seconds}s
                      </ThemedText>
                    )}
                  </View>
                  {exercise.notes && (
                    <ThemedText themeColor="textSecondary" type="small" style={styles.exerciseNotes}>
                      {exercise.notes}
                    </ThemedText>
                  )}
                </Card>
              ))}
          </ScrollView>
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
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.five,
  },
  header: {
    gap: Spacing.half,
    marginBottom: Spacing.two,
  },
  exerciseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  exerciseMetaRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  exerciseNotes: {
    fontStyle: 'italic',
  },
});
