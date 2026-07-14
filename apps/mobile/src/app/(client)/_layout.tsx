import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Colors } from '@/constants/theme';

// La vista de cliente siempre usa el tema oscuro premium (independiente del
// modo del sistema) — es la identidad visual de la tarjeta de acceso.
const colors = Colors.dark;

export default function ClientLayout() {
  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.accentSoft}
      labelStyle={{ selected: { color: colors.danger } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Acceso</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'qrcode', selected: 'qrcode.viewfinder' }} md="qr_code" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="routine">
        <NativeTabs.Trigger.Label>Rutina</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf="figure.strengthtraining.traditional"
          md="fitness_center"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Ajustes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
