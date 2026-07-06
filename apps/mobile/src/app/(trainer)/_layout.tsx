import { Stack } from 'expo-router';

export default function TrainerRootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="client/[id]" options={{ headerShown: true, title: 'Cliente' }} />
    </Stack>
  );
}
