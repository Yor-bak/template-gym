import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyMember, useMyRoutine } from '@/hooks/use-gym-data';

// Misma identidad visual oscura que la pantalla de Acceso.
const colors = Colors.dark;

export default function ClientRoutineScreen() {
  const { profile } = useAuth();
  const { data: member } = useMyMember(profile?.id);
  const { data: routine, isLoading } = useMyRoutine(member?.id);

  // Progreso de la sesión: solo vive en esta pantalla mientras está abierta,
  // no se guarda en el servidor (no hay todavía un registro de sesiones).
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setDoneIds(new Set());
  }, [routine?.id]);

  const sortedExercises = routine ? [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index) : [];
  const total = sortedExercises.length;
  const doneCount = sortedExercises.filter((e) => doneIds.has(e.id)).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const firstPendingId = sortedExercises.find((e) => !doneIds.has(e.id))?.id;

  function toggleDone(id: string) {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {isLoading ? (
          <ActivityIndicator color={colors.danger} style={styles.loader} />
        ) : !routine ? (
          <Text style={styles.empty}>
            Aún no hay una rutina disponible. Cuando tu entrenador te asigne una, o el gym publique rutinas
            genéricas, aparecerán aquí.
          </Text>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.headerCard}>
              <Text style={styles.routineTitle}>{routine.title}</Text>
              <View style={styles.headerMetaRow}>
                <Text style={styles.headerMeta}>
                  {routine.client_id ? 'Personalizada por tu entrenador' : 'Rutina genérica'}
                </Text>
                <Text style={styles.headerPercent}>{percent}%</Text>
              </View>
              {routine.goal && <Text style={styles.goalText}>{routine.goal}</Text>}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>{doneCount === 0 ? 'Ejercicios' : 'Siguientes ejercicios'}</Text>

            {sortedExercises.map((exercise) => {
              const done = doneIds.has(exercise.id);
              const isCurrent = exercise.id === firstPendingId;
              return (
                <Pressable
                  key={exercise.id}
                  onPress={() => toggleDone(exercise.id)}
                  style={[styles.exerciseCard, isCurrent && styles.exerciseCardCurrent]}>
                  <View style={[styles.checkCircle, done && styles.checkCircleDone]}>
                    {done && <Text style={styles.checkMark}>✓</Text>}
                  </View>
                  <View style={styles.exerciseInfo}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {exercise.sets} × {exercise.reps}
                      {exercise.rest_seconds != null ? ` · descanso ${exercise.rest_seconds}s` : ''}
                    </Text>
                    {exercise.notes && <Text style={styles.exerciseNotes}>{exercise.notes}</Text>}
                  </View>
                  {isCurrent && !done && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>EN CURSO</Text>
                    </View>
                  )}
                </Pressable>
              );
            })}

            {total > 0 && (
              <Pressable
                style={[styles.finishButton, doneCount < total && styles.finishButtonDisabled]}
                disabled={doneCount < total}
                onPress={() => setDoneIds(new Set())}>
                <Text style={styles.finishButtonText}>
                  {doneCount < total ? 'Termina todos los ejercicios' : 'Reiniciar rutina'}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        )}
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
  },
  loader: {
    marginTop: Spacing.five,
  },
  empty: {
    color: colors.textSecondary,
    marginTop: Spacing.three,
    fontSize: 15,
    lineHeight: 22,
  },
  list: {
    gap: Spacing.two,
    paddingBottom: Spacing.six,
  },
  headerCard: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.four,
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  routineTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  headerMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  headerPercent: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '800',
  },
  goalText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.backgroundElement,
    overflow: 'hidden',
    marginTop: Spacing.one,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.one,
  },
  exerciseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.three,
  },
  exerciseCardCurrent: {
    borderColor: colors.danger,
    borderWidth: 1.5,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: '#3DDC6B',
    borderColor: '#3DDC6B',
  },
  checkMark: {
    color: '#0A0E17',
    fontWeight: '900',
    fontSize: 14,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  exerciseNotes: {
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
  },
  currentBadge: {
    backgroundColor: colors.accentSoft,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    borderRadius: Spacing.four,
  },
  currentBadgeText: {
    color: colors.danger,
    fontSize: 10,
    fontWeight: '800',
  },
  finishButton: {
    marginTop: Spacing.three,
    backgroundColor: colors.danger,
    borderRadius: Spacing.three,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: colors.backgroundElement,
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
