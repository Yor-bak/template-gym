import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

const colors = Colors.dark;

const WEEKDAY_LABELS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTH_LABELS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function todayKey(): string {
  const d = new Date();
  return toDateKey(d.getFullYear(), d.getMonth(), d.getDate());
}

interface MiniCalendarProps {
  /** Fechas marcadas en formato YYYY-MM-DD (días donde el cliente completó una rutina). */
  markedDates: Set<string>;
  /** Título de la rutina completada ese día, para el detalle debajo del calendario. */
  labelsByDate?: Map<string, string>;
}

/** Calendario mensual simple, hecho a mano (sin librería externa) — marca en
 * verde los días donde el cliente completó una rutina. Navega mes a mes con
 * flechas; no permite ir a meses futuros. */
export function MiniCalendar({ markedDates, labelsByDate }: MiniCalendarProps) {
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const firstOfMonth = new Date(cursor.year, cursor.month, 1);
  // getDay(): 0=domingo..6=sábado — se convierte a semana que empieza en lunes.
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();

  const isCurrentMonth = cursor.year === now.getFullYear() && cursor.month === now.getMonth();
  const cells: Array<{ day: number; key: string } | null> = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      day: i + 1,
      key: toDateKey(cursor.year, cursor.month, i + 1),
    })),
  ];

  function goToPreviousMonth() {
    setSelectedDay(null);
    setCursor((prev) => (prev.month === 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: prev.month - 1 }));
  }

  function goToNextMonth() {
    if (isCurrentMonth) return;
    setSelectedDay(null);
    setCursor((prev) => (prev.month === 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: prev.month + 1 }));
  }

  const today = todayKey();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goToPreviousMonth} hitSlop={10} style={styles.navButton}>
          <Text style={styles.navButtonText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>
          {MONTH_LABELS[cursor.month]} {cursor.year}
        </Text>
        <Pressable onPress={goToNextMonth} hitSlop={10} disabled={isCurrentMonth} style={styles.navButton}>
          <Text style={[styles.navButtonText, isCurrentMonth && styles.navButtonDisabled]}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((label) => (
          <Text key={label} style={styles.weekdayLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell, index) => {
          if (!cell) return <View key={`blank-${index}`} style={styles.cell} />;
          const done = markedDates.has(cell.key);
          const isToday = cell.key === today;
          const isSelected = selectedDay === cell.key;
          return (
            <Pressable
              key={cell.key}
              style={styles.cell}
              disabled={!done}
              onPress={() => setSelectedDay(isSelected ? null : cell.key)}>
              <View style={[styles.dayCircle, done && styles.dayCircleDone, isToday && styles.dayCircleToday, isSelected && styles.dayCircleSelected]}>
                <Text style={[styles.dayText, done && styles.dayTextDone]}>{cell.day}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {selectedDay && labelsByDate?.has(selectedDay) && (
        <View style={styles.detailBox}>
          <Text style={styles.detailText}>✓ {labelsByDate.get(selectedDay)}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  navButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    color: colors.danger,
    fontSize: 20,
    fontWeight: '700',
  },
  navButtonDisabled: {
    color: colors.border,
  },
  weekdayRow: {
    flexDirection: 'row',
  },
  weekdayLabel: {
    flex: 1,
    textAlign: 'center',
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCircleDone: {
    backgroundColor: '#3DDC6B',
  },
  dayCircleToday: {
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  dayCircleSelected: {
    opacity: 0.7,
  },
  dayText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  dayTextDone: {
    color: '#0A0E17',
    fontWeight: '800',
  },
  detailBox: {
    marginTop: Spacing.one,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  detailText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
});
