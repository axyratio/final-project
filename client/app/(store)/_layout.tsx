// app/(profile)/_layout.tsx
import { getToken } from "@/utils/secure-store";
import { Slot, useRouter } from "expo-router";
import { useEffect } from "react";

export default function ProfileLayout() {
  const router = useRouter();

  useEffect(() => {
    const verify = async () => {
      const token = await getToken();
      if (!token) router.replace("/(auth)/login");
    };
    verify();
  }, []);

  
  return <Slot />;

  // return (
  //   <Stack screenOptions={{ headerShown: false }}>
  //     <Stack.Screen name="mystore" />
  //     <Stack.Screen name="create-store" />
  //   </Stack>
  // );
}
