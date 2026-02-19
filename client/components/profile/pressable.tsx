import { Box, HStack, IBoxProps, Pressable, Text, VStack } from "native-base";
import React, { useEffect, useState } from "react";
import {
  Pressable as RNPressable,
  PressableProps as RNPressableProps,
} from "react-native";
import { getRole } from "../../utils/secure-store"; // 👈 ดึง role จาก SecureStore

/* -------------------------------------------------------------
   CustomPressable (ดึง role อัตโนมัติ)
------------------------------------------------------------- */
type CustomPressableProps = RNPressableProps &
  IBoxProps & {
    title?: string;
    children?: React.ReactNode;
    icon?: React.ReactNode;
    iconPosition?: "left" | "right";
    justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
    color?: string;
    fontSize?: number;
    rolesAllowed?: ("user" | "admin" | "seller" | string)[]; // ใครเห็นได้บ้าง
  };

// ปุ่มกดสำหรับเมนูแต่ตั้งเป็น Custom เพื่อ
export const CustomPressable: React.FC<CustomPressableProps> = ({
  title,
  children,
  icon,
  iconPosition = "left",
  justifyContent = "flex-start",
  color,
  fontSize,
  rolesAllowed,
  ...props
}) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole); // โหลด role จาก SecureStore
  }, []);

  // ถ้า rolesAllowed ถูกตั้งไว้ และ role ปัจจุบันไม่ตรง → ไม่แสดง
  const isAllowed = !rolesAllowed || (role && rolesAllowed.includes(role));

  if (!isAllowed) return null;

  return (
    <RNPressable {...props}>
      {({ pressed }) => (
        <Box
          bg={pressed ? "coolGray.300" : "coolGray.100"}
          rounded="8"
          borderWidth={1}
          borderColor="coolGray.300"
          p={4}
          mx={2}
          {...props}
        >
          <HStack justifyContent={justifyContent} alignItems="center">
            {icon && iconPosition === "left" && <Box mr={2}>{icon}</Box>}

            {title ? (
              <Text color={color} fontSize={fontSize} width={"100%"}>
                {title}
              </Text>
            ) : (
              children
            )}

            {icon && iconPosition === "right" && <Box ml={2}>{icon}</Box>}
          </HStack>
        </Box>
      )}
    </RNPressable>
  );
};

/* -------------------------------------------------------------
   EditPressable (ดึง role อัตโนมัติ)
------------------------------------------------------------- */
type FormProfileProps = {
  value: string;
  title: string;
  onPress?: () => void;
  rolesAllowed?: ("user" | "admin" | string)[];
};

export const EditPressable = ({
  value,
  title,
  onPress,
  rolesAllowed,
}: FormProfileProps) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    getRole().then(setRole);
  }, []);

  const isAllowed = !rolesAllowed || (role && rolesAllowed.includes(role));

  if (!isAllowed) return null;

  return (
    <Pressable
      onPress={onPress}
      style={{ width: "100%", backgroundColor: "white" }}
    >
      <VStack space={2} w="100%" p={2}>
        <Text fontWeight="bold">{title}</Text>
        <Box p={2}>
          <Text>{value}</Text>
        </Box>
      </VStack>
    </Pressable>
  );
};
