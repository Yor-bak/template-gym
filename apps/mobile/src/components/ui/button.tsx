import { LinearGradient } from 'expo-linear-gradient';
import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Gradients, Shadows, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type ButtonVariant = 'primary' | 'secondary';

export type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
};

export function Button({ label, variant = 'primary', loading, disabled, style, ...rest }: ButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;

  return (
    <Pressable
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrapper,
        isPrimary && !isDisabled && Shadows.button,
        { opacity: pressed ? 0.85 : isDisabled ? 0.5 : 1 },
        typeof style === 'function' ? undefined : style,
      ]}
      {...rest}>
      {isPrimary ? (
        <LinearGradient colors={Gradients.brandButton} style={styles.base}>
          <ButtonContent loading={loading} color="#ffffff" label={label} />
        </LinearGradient>
      ) : (
        <View style={[styles.base, { backgroundColor: theme.backgroundElement, borderColor: theme.border, borderWidth: StyleSheet.hairlineWidth }]}>
          <ButtonContent loading={loading} color={theme.text} label={label} />
        </View>
      )}
    </Pressable>
  );
}

function ButtonContent({ loading, color, label }: { loading?: boolean; color: string; label: string }) {
  if (loading) return <ActivityIndicator color={color} />;
  return (
    <ThemedText type="smallBold" style={{ color }}>
      {label}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: Spacing.three,
  },
  base: {
    height: 52,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
});
