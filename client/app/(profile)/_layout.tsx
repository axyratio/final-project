// import { Stack, Slot, useRouter } from "expo-router";
// import { useEffect } from "react";
// import { getToken } from "@/utils/secure-store";

// export default function ProfileLayout() {
//   const router = useRouter();

//   useEffect(() => {
//     const verify = async () => {
//       const token = await getToken();
//       if (!token) router.replace("/(auth)/login");
//     };
//     verify();
//   }, []);

//   return (
//     <Stack screenOptions={{ headerShown: false }}>
//       <Slot /> {/* ✅ ใช้ Slot ให้ route ย่อย render ได้ */}
//     </Stack>
//   );
// }
// app/(profile)/_layout.tsx
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="edit" />
      <Stack.Screen name="me" />
      <Stack.Screen name="password" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="order-detail" />
    </Stack>
  );
}