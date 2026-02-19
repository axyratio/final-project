// app/(tabs)/profile.tsx
import { Avartar } from "@/components/avartar";
import { CustomPressable } from "@/components/profile/pressable";
import { Colors } from "@/constants/theme";
import { globalUserId, logout } from "@/utils/fetch-interceptor";
import { getToken, saveRole } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import Feather from "@expo/vector-icons/Feather";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import axios from "axios";
import { router } from "expo-router";
import {
  Box,
  Center,
  Flex,
  HStack,
  Spinner,
  StatusBar,
  Text,
} from "native-base";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type UserProfile = {
  username: string;
  image_url?: string;
  profile_picture?: string; // ✅ เพิ่ม profile_picture
};

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<UserProfile>({ username: "Ku" });

  // -------------------
  // Fetch user profile
  // -------------------
  useEffect(() => {
    let mounted = true;

    const fetchProfile = async () => {
      try {
        setLoading(true);

        const token = await getToken();
        // if (!token) {
        //   router.replace("/login");
        //   return;
        // }

        const res = await axios.get(`${DOMAIN}/profile/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("📸 Profile data:", res.data);

        if (mounted) {
          setUser({
            username: res.data.username,
            // ✅ ใช้ profile_picture ก่อน ถ้าไม่มีค่อยใช้ image_url
            image_url: res.data.profile_picture || res.data.image_url,
            profile_picture: res.data.profile_picture,
          });

          // Save user role to secure store
          if (res.data.user_role) {
            await saveRole(res.data.user_role);
          }
        }
      } catch (err) {
        console.log("❌ Profile fetch error:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  // -------------------
  // Handle logout
  // -------------------
  const handleLogout = async () => {
    try {
      console.log("[LOGOUT] global user id", globalUserId);
      setLoading(true);
      await logout();
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ สร้าง full URL สำหรับรูป
  const getImageUrl = () => {
    const imageUrl = user.profile_picture || user.image_url;

    if (!imageUrl) return undefined;

    // ถ้าเป็น URL เต็มอยู่แล้ว (http:// หรือ https://)
    if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
      return imageUrl;
    }

    // ถ้าเป็น path แบบ /uploads/... ให้ต่อกับ DOMAIN
    if (imageUrl.startsWith("/")) {
      return `${DOMAIN}${imageUrl}`;
    }

    // ถ้าเป็น path แบบ uploads/... ให้ต่อกับ DOMAIN/
    return `${DOMAIN}/${imageUrl}`;
  };

  const profileImageUrl = getImageUrl();

  console.log("🖼️ Profile image URL:", profileImageUrl);

  return (
    <Flex flex={1}>
      <StatusBar backgroundColor="#fff" />
      <Box safeAreaTop bg="#7c3aed" />

      {/* Header */}
      <Box bg="#7c3aed" borderBottomRadius={15} w="100%" py={4} px={4}>
        <HStack width="100%" justifyContent="flex-end">
          <Feather
            name="shopping-cart"
            size={25}
            color={themeColors.contrast}
          />
        </HStack>

        <HStack alignItems="center" style={{ gap: 5 }} mt={2}>
          {/* ✅ แสดงรูป profile picture */}
          <Avartar
            size="md"
            bg="#995ffd"
            imageUrl={profileImageUrl} // ← ใช้ URL ที่ปรับแล้ว
            name={user.username}
          />
          <Text color={themeColors.contrast} fontSize="md">
            {user.username || "ไม่มีชื่อผู้ใช้"}
          </Text>
        </HStack>
      </Box>

      {/* Content */}
      <Flex flex={1} justifyContent="space-between" my={4}>
        {/* ปุ่มบน */}
        <Box style={{ gap: 5 }}>
          <CustomPressable
            onPress={() => router.push("/me")}
            fontSize={12}
            p={3}
            mx={1}
            justifyContent="flex-start"
            title="แก้ไขโปรไฟล์"
            icon={
              <MaterialCommunityIcons
                name="account-edit"
                size={24}
                color="black"
              />
            }
            iconPosition="left"
          />

          {/* ปุ่มการซื้อของฉัน */}
          <CustomPressable
            onPress={() => router.push("/(profile)/orders" as any)}
            fontSize={12}
            mx={1}
            p={3}
            justifyContent="flex-start"
            title="การซื้อของฉัน"
            icon={
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={24}
                color="black"
              />
            }
            iconPosition="left"
          />

          <CustomPressable
            fontSize={12}
            mx={1}
            p={3}
            justifyContent="flex-start"
            title="ประวัติการซื้อ"
            icon={
              <MaterialCommunityIcons name="history" size={24} color="black" />
            }
            iconPosition="left"
          />

          {/* ปุ่มถูกใจ - เชื่อมไปหน้า wishlist */}
          <CustomPressable
            onPress={() => router.push("/(profile)/wishlist" as any)}
            mx={1}
            p={3}
            justifyContent="flex-start"
            fontSize={12}
            title="ถูกใจ"
            icon={
              <MaterialCommunityIcons name="heart" size={24} color="black" />
            }
            iconPosition="left"
          />

          <CustomPressable
            onPress={() => router.push("/(store)/create-store")}
            mx={1}
            p={3}
            justifyContent="flex-start"
            fontSize={12}
            title="สมัครเป็นร้านค้า"
            icon={
              <MaterialCommunityIcons name="store" size={24} color="black" />
            }
            iconPosition="left"
            rolesAllowed={["user"]}
          />

          <CustomPressable
            onPress={() => router.push("/(seller)/seller-menu")}
            mx={1}
            p={3}
            justifyContent="flex-start"
            fontSize={12}
            title="ร้านค้าของฉัน"
            icon={
              <MaterialCommunityIcons name="store" size={24} color="black" />
            }
            iconPosition="left"
            rolesAllowed={["seller"]}
          />
        </Box>

        {/* Logout ปุ่มล่างสุด */}
        <CustomPressable
          fontSize={12}
          onPress={handleLogout}
          mx={1}
          p={3}
          justifyContent="flex-start"
          title="ออกจากระบบ"
          icon={
            <MaterialCommunityIcons name="logout" size={24} color="purple" />
          }
          iconPosition="left"
        />
      </Flex>

      {/* Loading overlay */}
      {loading && (
        <Center
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="rgba(0,0,0,0.3)"
          zIndex={10}
        >
          <Spinner color="white" size="lg" />
        </Center>
      )}
    </Flex>
  );
}
