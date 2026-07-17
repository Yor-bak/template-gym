import { Stack } from 'expo-router';

export default function TrainerRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="client/[id]" />
      <Stack.Screen name="scan-client" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
