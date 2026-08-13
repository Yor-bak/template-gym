/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

// Paleta basada en el logo del gym (American Fitness): azul marino, plateado y rojo.
export const Colors = {
  light: {
    text: '#0A0E17',
    background: '#F5F6F9',
    surface: '#FFFFFF',
    backgroundElement: '#EEF0F4',
    backgroundSelected: '#E1E4EA',
    textSecondary: '#5C6472',
    accent: '#16305A',
    accentSoft: '#E3EAF3',
    silver: '#9AA3B2',
    danger: '#C8102E',
    border: '#E2E5EB',
  },
  dark: {
    text: '#F5F7FA',
    background: '#05070C',
    surface: '#141922',
    backgroundElement: '#1B212C',
    backgroundSelected: '#262E3B',
    textSecondary: '#9AA3B5',
    accent: '#5B8AD1',
    accentSoft: '#182A45',
    silver: '#C7CCD6',
    danger: '#FF4D5E',
    border: '#232B38',
  },
} as const;

/** Gradientes de marca usados en tarjetas destacadas y CTAs. */
export const Gradients = {
  brand: ['#081226', '#16305A', '#3F6CAB'] as const,
  brandButton: ['#1C3F6E', '#3F6CAB'] as const,
  danger: ['#2B0710', '#7A1023'] as const,
  silver: ['#4A5568', '#9AA3B2', '#E5E8ED'] as const,
};

/** Sombras premium (elevación real, no solo bordes planos). */
export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
    },
    android: { elevation: 6 },
    default: {},
  }),
  button: Platform.select({
    ios: {
      shadowColor: '#16305A',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
    },
    android: { elevation: 4 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.22,
      shadowRadius: 28,
    },
    android: { elevation: 12 },
    default: {},
  }),
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
