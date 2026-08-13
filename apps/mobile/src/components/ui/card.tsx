import { StyleSheet, View, type ViewProps } from 'react-native';

import { Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  elevated?: boolean;
};

/** Tarjeta con superficie propia y sombra real, para un look premium en vez de bloques planos. */
export function Card({ style, elevated = true, ...rest }: CardProps) {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.base,
        { backgroundColor: theme.surface, borderColor: theme.border },
        elevated && Shadows.card,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.three,
  },
});
