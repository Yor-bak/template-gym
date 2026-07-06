import { useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth-context';
import { useClientRoutine } from '@/hooks/use-gym-data';
import { supabase } from '@/lib/supabase';

type EditableExercise = {
  id?: string;
  name: string;
  sets: string;
  reps: string;
  rest_seconds: string;
  notes: string;
};

const EMPTY_EXERCISE: EditableExercise = { name: '', sets: '3', reps: '10', rest_seconds: '60', notes: '' };

export default function ClientRoutineEditorScreen() {
  const { id: clientId } = useLocalSearchParams<{ id: string }>();
  const { profile: trainer } = useAuth();
  const queryClient = useQueryClient();
  const { data: routine, isLoading } = useClientRoutine(clientId);

  const [title, setTitle] = useState('');
  const [goal, setGoal] = useState('');
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [newExercise, setNewExercise] = useState<EditableExercise>(EMPTY_EXERCISE);
  const [saving, setSaving] = useState(false);
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
          }))
      );
    }
  }, [routine, isLoading]);

  function addExercise() {
    if (!newExercise.name.trim()) return;
    setExercises((prev) => [...prev, newExercise]);
    setNewExercise(EMPTY_EXERCISE);
  }

  function removeExercise(index: number) {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!trainer?.id || !clientId || !title.trim()) return;
    setSaving(true);

    let routineId = routine?.id;

    if (!routineId) {
      const { data, error } = await supabase
        .from('routines')
        .insert({ trainer_id: trainer.id, client_id: clientId, title: title.trim(), goal: goal.trim() || null })
        .select()
        .single();
      if (error) {
        setSaving(false);
        return;
      }
      routineId = data.id;
    } else {
      await supabase.from('routines').update({ title: title.trim(), goal: goal.trim() || null }).eq('id', routineId);
      await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    }

    if (exercises.length) {
      await supabase.from('routine_exercises').insert(
        exercises.map((e, index) => ({
          routine_id: routineId,
          name: e.name.trim(),
          sets: Number(e.sets) || 0,
          reps: e.reps.trim(),
          rest_seconds: e.rest_seconds ? Number(e.rest_seconds) : null,
          order_index: index,
          notes: e.notes.trim() || null,
        }))
      );
    }

    await queryClient.invalidateQueries({ queryKey: ['client-routine', clientId] });
    setSaving(false);
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator style={styles.loader} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ThemedText type="subtitle">Rutina del cliente</ThemedText>

        <TextField label="Título de la rutina" value={title} onChangeText={setTitle} placeholder="Ej. Fuerza tren superior" />
        <TextField
          label="Objetivo"
          value={goal}
          onChangeText={setGoal}
          placeholder="Ej. ganancia_muscular, perdida_grasa"
        />

        <View style={styles.exerciseListHeader}>
          <ThemedText type="smallBold">Ejercicios</ThemedText>
        </View>

        {exercises.map((exercise, index) => (
          <Card key={exercise.id ?? `new-${index}`} style={styles.exerciseCard}>
            <View style={styles.exerciseCardHeader}>
              <ThemedText type="smallBold">{exercise.name}</ThemedText>
              <ThemedText themeColor="danger" type="small" onPress={() => removeExercise(index)}>
                Quitar
              </ThemedText>
            </View>
            <ThemedText themeColor="textSecondary" type="small">
              {exercise.sets} series × {exercise.reps} reps
              {exercise.rest_seconds ? ` · descanso ${exercise.rest_seconds}s` : ''}
            </ThemedText>
            {exercise.notes ? (
              <ThemedText themeColor="textSecondary" type="small" style={styles.exerciseNotes}>
                {exercise.notes}
              </ThemedText>
            ) : null}
          </Card>
        ))}

        <Card elevated={false} style={styles.newExerciseCard}>
          <ThemedText type="small" themeColor="textSecondary">
            Agregar ejercicio
          </ThemedText>
          <TextField
            label="Nombre"
            value={newExercise.name}
            onChangeText={(name) => setNewExercise((prev) => ({ ...prev, name }))}
            placeholder="Ej. Press de banca"
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <TextField
                label="Series"
                value={newExercise.sets}
                onChangeText={(sets) => setNewExercise((prev) => ({ ...prev, sets }))}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.rowItem}>
              <TextField
                label="Reps"
                value={newExercise.reps}
                onChangeText={(reps) => setNewExercise((prev) => ({ ...prev, reps }))}
                placeholder="8-12"
              />
            </View>
            <View style={styles.rowItem}>
              <TextField
                label="Descanso (s)"
                value={newExercise.rest_seconds}
                onChangeText={(rest_seconds) => setNewExercise((prev) => ({ ...prev, rest_seconds }))}
                keyboardType="number-pad"
              />
            </View>
          </View>
          <TextField
            label="Notas (opcional)"
            value={newExercise.notes}
            onChangeText={(notes) => setNewExercise((prev) => ({ ...prev, notes }))}
          />
          <Button label="Agregar ejercicio" variant="secondary" onPress={addExercise} disabled={!newExercise.name.trim()} />
        </Card>

        <Button label="Guardar rutina" onPress={handleSave} loading={saving} disabled={!title.trim()} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loader: {
    marginTop: Spacing.five,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  exerciseListHeader: {
    marginTop: Spacing.two,
  },
  exerciseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.half,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  exerciseNotes: {
    fontStyle: 'italic',
  },
  newExerciseCard: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  rowItem: {
    flex: 1,
  },
});
