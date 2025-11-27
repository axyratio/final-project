import React from "react";
import { SegmentedButtons } from "react-native-paper";

// const SegmentButton = () => {
//   const [value, setValue] = React.useState('');

//   return (
//       <SegmentedButtons
//         value={value}
//         onValueChange={setValue}
//         buttons={[
//           {
//             value: 'ทั้งหมด',
//             label: 'หมวดหมู่',
//           },
//           {
//             value: 'train',
//             label: 'Transit',
//           },
//           {
//             value: 'drive',
//             label: 'Driving',
//           },
//         ]}
//       />
//   );
// };

// components/store/ChatButton.tsx
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type ChatButtonProps = {
  route: string; // เส้นทางไปหน้าแชท เช่น "/chat/store/xxx"
};

export function ChatButton({ route }: ChatButtonProps) {
  const router = useRouter();

  const handlePress = () => {
    if (!route) return;
    router.push(route as any);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "#ede9fe",
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      <Ionicons name="chatbubbles-outline" size={18} color="#7c3aed" />
    </Pressable>
  );
}


// components/store/EditIconButton.tsx


type EditIconButtonProps = {
  route: string;              // เส้นทางที่จะแก้ไข เช่น "/(store)/add-product?productId=xxx"
};

// export function EditIconButton({ route }: EditIconButtonProps) {
//   const router = useRouter();

//   const handlePress = () => {
//     if (!route) return;
//     router.push(route as any);
//   };

//   return (
//     <Pressable
//       onPress={handlePress}
//       style={{
//         padding: 4,
//       }}
//     >
//       <Ionicons name="create-outline" size={18} color="#6b21a8" />
//     </Pressable>
//   );
// }
