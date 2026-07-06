import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function ClientLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.accent } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Inicio</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'qrcode', selected: 'qrcode.viewfinder' }} md="qr_code" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="routine">
        <NativeTabs.Trigger.Label>Rutina</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="figure.strengthtraining.traditional"
          md="fitness_center"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trainer">
        <NativeTabs.Trigger.Label>Entrenador</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.badge.shield.checkmark" md="verified_user" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
