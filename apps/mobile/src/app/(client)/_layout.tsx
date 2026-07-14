import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

// La vista de cliente siempre usa el tema oscuro premium (independiente del
// modo del sistema) — es la identidad visual de la tarjeta de acceso.
const colors = Colors.dark;

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function ClientLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.danger,
        tabBarInactiveTintColor: colors.textSecondary,
        // Sin "height" fijo: react-navigation agrega el inset de la safe
        // area de abajo automáticamente (gestos vs. barra de 3 botones),
        // así la barra nunca queda tapada por la navegación del sistema.
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Acceso',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor('qr-code', focused)} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="routine"
        options={{
          title: 'Rutina',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor('barbell', focused)} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor('settings', focused)} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen name="trainer" options={{ href: null }} />
    </Tabs>
  );
}

function iconFor(base: 'qr-code' | 'barbell' | 'settings', focused: boolean): IoniconName {
  return (focused ? base : `${base}-outline`) as IoniconName;
}

const styles = StyleSheet.create({
  tabBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.one,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
