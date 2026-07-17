import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useMyMember, useMyRoutine } from '@/hooks/use-gym-data';
import { CATEGORY_LABEL_ES, getExerciseById } from '@/lib/exercise-catalog';

// Misma identidad visual oscura que la pantalla de Acceso.
const colors = Colors.dark;

function formatElapsed(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function ClientRoutineScreen() {
  const { profile } = useAuth();
  const { data: member } = useMyMember(profile?.id);
  const { data: routine, isLoading } = useMyRoutine(member?.id);

  // Progreso y tiempo de la sesión: solo viven en esta pantalla mientras está
  // abierta, no se guardan en el servidor (no hay todavía un registro de sesiones).
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [finishedAt, setFinishedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setDoneIds(new Set());
    setExpandedId(null);
    setStartedAt(null);
    setFinishedAt(null);
    setElapsedSeconds(0);
  }, [routine?.id]);

  // El temporizador corre mientras la rutina está iniciada y no se ha
  // terminado; se congela en cuanto se marcan todos los ejercicios.
  useEffect(() => {
    if (!startedAt || finishedAt) return;
    const tick = () => setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, finishedAt]);

  const sortedExercises = routine ? [...routine.routine_exercises].sort((a, b) => a.order_index - b.order_index) : [];
  const total = sortedExercises.length;
  const doneCount = sortedExercises.filter((e) => doneIds.has(e.id)).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const firstPendingId = sortedExercises.find((e) => !doneIds.has(e.id))?.id;
  const started = startedAt !== null;

  function toggleDone(id: string) {
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      if (next.size === total && !finishedAt) setFinishedAt(Date.now());
      else if (next.size < total && finishedAt) setFinishedAt(null);

      return next;
    });
  }

  function startRoutine() {
    setDoneIds(new Set());
    setFinishedAt(null);
    setElapsedSeconds(0);
    setStartedAt(Date.now());
  }

  function restartRoutine() {
    setDoneIds(new Set());
    setStartedAt(null);
    setFinishedAt(null);
    setElapsedSeconds(0);
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        {isLoading ? (
          <ActivityIndicator color={colors.danger} style={styles.loader} />
        ) : !routine ? (
          <Text style={styles.empty}>
            Todavía no tienes una rutina asignada. En cuanto tu entrenador te asigne una, aparecerá aquí.
          </Text>
        ) : !started ? (
          <View style={styles.startScreen}>
            <View style={styles.headerCard}>
              <Text style={styles.routineTitle}>{routine.title}</Text>
              <Text style={styles.headerMeta}>Personalizada por tu entrenador</Text>
              {routine.goal && <Text style={styles.goalText}>{routine.goal}</Text>}
              <Text style={styles.exerciseCountText}>
                {total} ejercicio{total === 1 ? '' : 's'}
              </Text>
            </View>
            <Pressable style={styles.startButton} onPress={startRoutine} disabled={total === 0}>
              <Text style={styles.startButtonText}>Iniciar rutina</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            <View style={styles.headerCard}>
              <Text style={styles.routineTitle}>{routine.title}</Text>
              <View style={styles.timerRow}>
                <Text style={styles.timerText}>{formatElapsed(elapsedSeconds)}</Text>
                {finishedAt && <Text style={styles.finishedLabel}>¡Terminada!</Text>}
              </View>
              <View style={styles.headerMetaRow}>
                <Text style={styles.headerMeta}>Personalizada por tu entrenador</Text>
                <Text style={styles.headerPercent}>{percent}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${percent}%` }]} />
              </View>
            </View>

            <Text style={styles.sectionLabel}>{doneCount === 0 ? 'Ejercicios' : 'Siguientes ejercicios'}</Text>

            {sortedExercises.map((exercise) => {
              const done = doneIds.has(exercise.id);
              const isCurrent = exercise.id === firstPendingId;
              const catalogEntry = exercise.catalog_id ? getExerciseById(exercise.catalog_id) : undefined;
              const expanded = expandedId === exercise.id;
              return (
                <View key={exercise.id} style={[styles.exerciseCard, isCurrent && styles.exerciseCardCurrent]}>
                  <Pressable style={styles.exerciseRow} onPress={() => toggleDone(exercise.id)}>
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

                  {catalogEntry && (
                    <View style={styles.instructionsSection}>
                      <Pressable onPress={() => setExpandedId(expanded ? null : exercise.id)}>
                        <Text style={styles.instructionsToggle}>
                          {expanded ? 'Ocultar instrucciones ▲' : 'Ver instrucciones ▼'}
                        </Text>
                      </Pressable>
                      {expanded && (
                        <View style={styles.instructionsBody}>
                          <Text style={styles.instructionsMuscle}>
                            Trabaja: {CATEGORY_LABEL_ES[catalogEntry.category] ?? catalogEntry.category} ·{' '}
                            {catalogEntry.target}
                          </Text>
                          {catalogEntry.steps.map((step, i) => (
                            <Text key={i} style={styles.instructionsStep}>
                              {i + 1}. {step}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {total > 0 && (
              <Pressable
                style={[styles.finishButton, doneCount < total && styles.finishButtonDisabled]}
                disabled={doneCount < total}
                onPress={restartRoutine}>
                <Text style={styles.finishButtonText}>
                  {doneCount < total ? 'Termina todos los ejercicios' : `Reiniciar rutina · ${formatElapsed(elapsedSeconds)}`}
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
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  exerciseCountText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: Spacing.one,
  },
  startButton: {
    backgroundColor: colors.danger,
    borderRadius: Spacing.three,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
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
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.two,
  },
  timerText: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  finishedLabel: {
    color: '#3DDC6B',
    fontSize: 13,
    fontWeight: '800',
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
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  instructionsSection: {
    marginTop: Spacing.two,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  instructionsToggle: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  instructionsBody: {
    marginTop: Spacing.two,
    gap: 6,
  },
  instructionsMuscle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  instructionsStep: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
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
