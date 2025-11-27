// components/store/EditIconButton.tsx
import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type EditIconButtonProps = {
  route: string;              // เส้นทางที่จะแก้ไข เช่น "/(store)/add-product?productId=xxx"
};

export default function EditIconButton({ route }: EditIconButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (!route) return;
    router.push(route as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        padding: 4,
      }}
    >
      <Ionicons name="create-outline" size={18} color="#6b21a8" />
    </Pressable>
  );
}
