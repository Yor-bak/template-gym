import rawCatalog from '@/data/exercise-catalog.json';

// Catálogo de ejercicios (nombre, categoría, músculo, instrucciones en
// español paso a paso). Solo texto — sin imágenes/GIFs por un tema de
// licencia de los medios del dataset original (ver commit). Fuente:
// https://github.com/hasaneyldrm/exercises-dataset (dataset MIT, medios
// © Gym visual, excluidos a propósito).
export interface CatalogExercise {
  id: string;
  name: string;
  category: string;
  equipment: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string;
  steps: string[];
}

export const exerciseCatalog: CatalogExercise[] = rawCatalog as CatalogExercise[];

const byId = new Map(exerciseCatalog.map((e) => [e.id, e]));

// Nombres de categoría en español para mostrar en la UI — el dataset trae
// las categorías en inglés (son solo 10 valores fijos).
export const CATEGORY_LABEL_ES: Record<string, string> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Abdomen',
};

export const CATEGORIES = Object.keys(CATEGORY_LABEL_ES);

export function getExerciseById(id: string): CatalogExercise | undefined {
  return byId.get(id);
}

/** Busca por nombre (contiene, sin importar mayúsculas/acentos) y opcionalmente filtra por categoría. */
export function searchExercises(query: string, category?: string | null): CatalogExercise[] {
  const normalizedQuery = normalize(query.trim());
  let results = exerciseCatalog;

  if (category) {
    results = results.filter((e) => e.category === category);
  }

  if (normalizedQuery) {
    results = results.filter((e) => normalize(e.name).includes(normalizedQuery));
  }

  return results.slice(0, 60);
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
