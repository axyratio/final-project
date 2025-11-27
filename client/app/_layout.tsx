import { ProfileProvider } from '@/context/Refresh';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { NativeBaseProvider } from 'native-base';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";


// async function RootStack() {
//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//         <Stack.Screen name="(auth)/login" />
//       ) : (
//         <Stack.Screen name="(tabs)/index" />
//       )}
//     </Stack>
//   );
// }

export default function RootLayout() {
  return (
        <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ProfileProvider>
          <PaperProvider>
            <NativeBaseProvider>
              <Slot />
              <StatusBar style="auto" />
            </NativeBaseProvider>
          </PaperProvider>
        </ProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
