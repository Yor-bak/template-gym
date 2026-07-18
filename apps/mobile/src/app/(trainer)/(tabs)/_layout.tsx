import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

// Misma barra inferior que la vista de cliente (react-navigation bottom
// tabs), en vez de NativeTabs: en web NativeTabs se renderiza como una
// barra de pastillas arriba, que chocaba visualmente con el botón
// "Escanear cliente" del header de la pantalla de clientes.
const colors = Colors.dark;

type IoniconName = keyof typeof Ionicons.glyphMap;

export default function TrainerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: [
          styles.tabBar,
          { backgroundColor: colors.background, borderTopColor: colors.border },
        ],
        tabBarLabelStyle: styles.tabBarLabel,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mis clientes',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor('people', focused)} color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={iconFor('person-circle', focused)} color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

function iconFor(base: 'people' | 'person-circle', focused: boolean): IoniconName {
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
