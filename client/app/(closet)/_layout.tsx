import { Stack } from 'expo-router';

export default function ClosetLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="virtual-tryon" />
    </Stack>
  );
}