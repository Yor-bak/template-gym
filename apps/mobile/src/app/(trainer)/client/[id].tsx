import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePickerModal } from '@/components/exercise-catalog/exercise-picker-modal';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useClientRoutine, useMember } from '@/hooks/use-gym-data';
import type { CatalogExercise } from '@/lib/exercise-catalog';
import { mockDb } from '@/lib/mock-db';

// Misma identidad visual oscura que el resto de la vista de entrenador —
// acento azul en vez del rojo del cliente.
const colors = Colors.dark;

type EditableExercise = {
  id?: string;
  name: string;
  sets: string;
  reps: string;
  rest_seconds: string;
  notes: string;
  catalogId: string | null;
};

const EMPTY_EXERCISE: EditableExercise = {
  name: '',
  sets: '3',
  reps: '10',
  rest_seconds: '60',
  notes: '',
  catalogId: null,
};

export default function ClientRoutineEditorScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const { profile: trainer } = useAuth();
  const queryClient = useQueryClient();
  const { data: client } = useMember(clientId);
  const { data: routine, isLoading } = useClientRoutine(clientId);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [newExercise, setNewExercise] = useState<EditableExercise>(EMPTY_EXERCISE);
  const [saving, setSaving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || isLoading) return;
    initialized.current = true;
    if (routine) {
      setTitle(routine.title);
      setGoal(routine.goal ?? '');
      setExercises(
        [...routine.routine_exercises]
          .sort((a, b) => a.order_index - b.order_index)
          .map((e) => ({
            id: e.id,
            name: e.name,
            sets: String(e.sets),
            reps: e.reps,
            rest_seconds: e.rest_seconds != null ? String(e.rest_seconds) : '',
            notes: e.notes ?? '',
            catalogId: e.catalog_id,
          }))
      );
    }
  }, [routine, isLoading]);

  function addExercise() {
    if (!newExercise.name.trim()) return;
    setExercises((prev) => [...prev, newExercise]);
    setNewExercise(EMPTY_EXERCISE);
  }

  function handlePickFromCatalog(exercise: CatalogExercise) {
    setNewExercise((prev) => ({ ...prev, name: exercise.name, catalogId: exercise.id }));
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!trainer?.id || !clientId || !title.trim()) return;
    setSaving(true);

    mockDb.saveClientRoutine({
      trainerId: trainer.id,
      clientId,
      title: title.trim(),
      goal: goal.trim() || null,
      exercises: exercises.map((e) => ({
        name: e.name.trim(),
        sets: Number(e.sets) || 0,
        reps: e.reps.trim(),
        rest_seconds: e.rest_seconds ? Number(e.rest_seconds) : null,
        order_index: 0,
        notes: e.notes.trim() || null,
        catalog_id: e.catalogId,
      })),
    });

    await queryClient.invalidateQueries({ queryKey: ['client-routine', clientId] });
    setSaving(false);
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
        <View style={styles.navRow}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
            <Ionicons name="chevron-back" size={18} color={colors.accent} />
            <Text style={styles.backButtonText}>Clientes</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {client && (
            <View style={styles.clientHeader}>
              <View style={styles.clientAvatar}>
                <Text style={styles.clientAvatarInitial}>{client.first_name.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text style={styles.clientName}>
                  {client.first_name} {client.last_name}
                </Text>
                <Text style={styles.clientSubtitle}>Rutina personalizada</Text>
              </View>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Detalles</Text>
            <Field label="Título de la rutina">
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Ej. Fuerza tren superior"
                placeholderTextColor={colors.textSecondary}
              />
            </Field>
            <Field label="Objetivo">
              <TextInput
                style={styles.input}
                value={goal}
                onChangeText={setGoal}
                placeholder="Ej. ganancia_muscular, perdida_grasa"
                placeholderTextColor={colors.textSecondary}
              />
            </Field>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>Ejercicios</Text>
            {exercises.length > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{exercises.length}</Text>
              </View>
            )}
          </View>

          {exercises.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="barbell-outline" size={22} color={colors.textSecondary} />
              <Text style={styles.emptyExercisesText}>Todavía no agregas ejercicios a esta rutina.</Text>
            </View>
          ) : (
            exercises.map((exercise, index) => (
              <View key={exercise.id ?? `new-${index}`} style={styles.exerciseCard}>
                <View style={styles.exerciseCardHeader}>
                  <View style={styles.exerciseNameRow}>
                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                    {exercise.catalogId && (
                      <View style={styles.catalogBadge}>
                        <Ionicons name="checkmark-circle" size={12} color="#3DDC6B" />
                        <Text style={styles.catalogBadgeText}>Del catálogo</Text>
                      </View>
                    )}
                  </View>
                  <Pressable onPress={() => removeExercise(index)} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </Pressable>
                </View>
                <Text style={styles.exerciseMeta}>
                  {exercise.sets} series × {exercise.reps} reps
                  {exercise.rest_seconds ? ` · descanso ${exercise.rest_seconds}s` : ''}
                </Text>
                {exercise.notes ? <Text style={styles.exerciseNotes}>{exercise.notes}</Text> : null}
              </View>
            ))
          )}

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Agregar ejercicio</Text>
            <Pressable
              style={({ pressed }) => [styles.catalogButton, pressed && styles.catalogButtonPressed]}
              onPress={() => setPickerVisible(true)}>
              <Ionicons name="search-outline" size={16} color={colors.text} />
              <Text style={styles.catalogButtonText}>Elegir del catálogo</Text>
            </Pressable>
            <Field label="Nombre">
              <TextInput
                style={styles.input}
                value={newExercise.name}
                onChangeText={(name) => setNewExercise((prev) => ({ ...prev, name, catalogId: null }))}
                placeholder="Ej. Press de banca (o elige del catálogo arriba)"
                placeholderTextColor={colors.textSecondary}
              />
            </Field>
            <View style={styles.row}>
              <View style={styles.rowItem}>
                <Field label="Series">
                  <TextInput
                    style={styles.input}
                    value={newExercise.sets}
                    onChangeText={(sets) => setNewExercise((prev) => ({ ...prev, sets }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="Reps">
                  <TextInput
                    style={styles.input}
                    value={newExercise.reps}
                    onChangeText={(reps) => setNewExercise((prev) => ({ ...prev, reps }))}
                    placeholder="8-12"
                    placeholderTextColor={colors.textSecondary}
                  />
                </Field>
              </View>
              <View style={styles.rowItem}>
                <Field label="Descanso (s)">
                  <TextInput
                    style={styles.input}
                    value={newExercise.rest_seconds}
                    onChangeText={(rest_seconds) => setNewExercise((prev) => ({ ...prev, rest_seconds }))}
                    keyboardType="number-pad"
                    placeholderTextColor={colors.textSecondary}
                  />
                </Field>
              </View>
            </View>
            <Field label="Notas (opcional)">
              <TextInput
                style={styles.input}
                value={newExercise.notes}
                onChangeText={(notes) => setNewExercise((prev) => ({ ...prev, notes }))}
                placeholderTextColor={colors.textSecondary}
              />
            </Field>
            <Pressable
              style={[styles.secondaryButton, !newExercise.name.trim() && styles.buttonDisabled]}
              disabled={!newExercise.name.trim()}
              onPress={addExercise}>
              <Ionicons name="add" size={18} color={colors.text} />
              <Text style={styles.secondaryButtonText}>Agregar ejercicio</Text>
            </Pressable>
          </View>

          <Pressable
            style={[styles.primaryButton, (!title.trim() || saving) && styles.buttonDisabled]}
            disabled={!title.trim() || saving}
            onPress={handleSave}>
            {saving ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={colors.text} />
                <Text style={styles.primaryButtonText}>Guardar rutina</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </SafeAreaView>

      <ExercisePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handlePickFromCatalog}
      />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
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
  navRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  loader: {
    marginTop: Spacing.five,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  clientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    marginBottom: Spacing.one,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientAvatarInitial: {
    color: colors.accent,
    fontSize: 18,
    fontWeight: '800',
  },
  clientName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  clientSubtitle: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  field: {
    gap: Spacing.one,
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    height: 48,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.backgroundElement,
    color: colors.text,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    marginTop: Spacing.two,
  },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: colors.accentSoft,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  emptyExercises: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderStyle: 'dashed',
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.one,
  },
  emptyExercisesText: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.three,
    gap: 4,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    flexShrink: 1,
  },
  catalogBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1D3B24',
    paddingHorizontal: Spacing.one,
    paddingVertical: 2,
    borderRadius: Spacing.two,
  },
  catalogBadgeText: {
    color: '#3DDC6B',
    fontSize: 10,
    fontWeight: '700',
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
  catalogButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 44,
    borderRadius: Spacing.three,
    backgroundColor: colors.accent,
  },
  catalogButtonPressed: {
    opacity: 0.85,
  },
  catalogButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowItem: {
    flex: 1,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 52,
    borderRadius: Spacing.three,
    backgroundColor: colors.accent,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
    height: 48,
    borderRadius: Spacing.three,
    backgroundColor: colors.backgroundElement,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
