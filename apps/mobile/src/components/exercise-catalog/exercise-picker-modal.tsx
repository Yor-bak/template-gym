import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Spacing } from '@/constants/theme';
import {
  CATEGORIES,
  CATEGORY_LABEL_ES,
  type CatalogExercise,
  searchExercises,
} from '@/lib/exercise-catalog';

const colors = Colors.dark;

interface ExercisePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (exercise: CatalogExercise) => void;
}

/** Buscador del catálogo de 1,300+ ejercicios (solo texto: nombre, músculo,
 * instrucciones — sin imágenes, ver lib/exercise-catalog.ts). Usado tanto por
 * el entrenador al armar una rutina personalizada como por el admin al armar
 * una rutina genérica. */
export function ExercisePickerModal({ visible, onClose, onSelect }: ExercisePickerModalProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const results = useMemo(() => searchExercises(query, category), [query, category]);

  function handleSelect(exercise: CatalogExercise) {
    onSelect(exercise);
    setQuery('');
    setCategory(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <SafeAreaView edges={['top']} style={styles.header}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Catálogo de ejercicios</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.searchField}>
            <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar ejercicio..."
              placeholderTextColor={colors.textSecondary}
              style={styles.searchInput}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={CATEGORIES}
            keyExtractor={(c) => c}
            contentContainerStyle={styles.chipsRow}
            renderItem={({ item }) => {
              const selected = category === item;
              return (
                <Pressable
                  onPress={() => setCategory(selected ? null : item)}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {CATEGORY_LABEL_ES[item] ?? item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </SafeAreaView>

        <FlatList
          data={results}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text style={styles.emptyText}>No se encontraron ejercicios con esa búsqueda.</Text>
          }
          renderItem={({ item }) => (
            <Pressable style={styles.resultRow} onPress={() => handleSelect(item)}>
              <View style={styles.resultInfo}>
                <Text style={styles.resultName}>{item.name}</Text>
                <Text style={styles.resultMeta}>
                  {CATEGORY_LABEL_ES[item.category] ?? item.category} · {item.target}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={24} color={colors.danger} />
            </Pressable>
          )}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: Spacing.two,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.two,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    height: 48,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    backgroundColor: colors.backgroundElement,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  chipsRow: {
    gap: Spacing.one,
    paddingVertical: Spacing.one,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: 8,
    borderRadius: Spacing.four,
    backgroundColor: colors.backgroundElement,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#ffffff',
  },
  list: {
    padding: Spacing.four,
    gap: Spacing.two,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.five,
    fontSize: 14,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.three,
  },
  resultInfo: {
    flex: 1,
    gap: 2,
  },
  resultName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  resultMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
