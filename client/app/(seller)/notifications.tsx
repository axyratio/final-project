// app/(seller)/notifications.tsx
import {
  fetchSellerNotifications,
  markNotificationAsRead,
  SellerNotification,
} from "@/api/seller";
import { useSellerNotificationContext } from "@/context/SellerNotificationContext";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Badge,
  Box,
  Center,
  HStack,
  Pressable,
  Spinner,
  StatusBar,
  Text,
  useToast,
  VStack,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl } from "react-native";

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  ORDER_RECEIVED: "cart",
  ORDER_COMPLETED: "checkmark-circle",
  RETURN_REQUEST: "return-down-back",
  LOW_STOCK: "alert-circle",
};

const NOTIFICATION_COLORS: Record<string, string> = {
  ORDER_RECEIVED: "#10b981",
  ORDER_COMPLETED: "#3b82f6",
  RETURN_REQUEST: "#f59e0b",
  LOW_STOCK: "#ef4444",
};

export default function SellerNotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const {
    isConnected,
    lastNotification,
    notifications: wsNotifications,
  } = useSellerNotificationContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);

  useEffect(() => {
    loadNotifications();
  }, []);

  // อัพเดท notifications เมื่อได้รับจาก WebSocket
  useEffect(() => {
    if (lastNotification && lastNotification.type === "NOTIFICATION") {
      const newNotification: SellerNotification = {
        notification_id: lastNotification.notification_id!,
        type: lastNotification.notification_type!,
        title: lastNotification.title!,
        message: lastNotification.message!,
        order_id: lastNotification.order_id,
        return_id: lastNotification.return_id,
        product_id: lastNotification.product_id,
        is_read: false,
        created_at: lastNotification.created_at!,
      };

      // เพิ่มการแจ้งเตือนใหม่ที่ด้านบน
      setNotifications((prev) => [newNotification, ...prev]);

      // แสดง toast
      toast.show({
        description: lastNotification.title,
        duration: 3000,
        bg: "violet.600",
      });
    }
  }, [lastNotification]);

  const loadNotifications = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const data = await fetchSellerNotifications(token);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
      toast.show({
        description: "ไม่สามารถโหลดข้อมูลได้",
        duration: 2000,
        bg: "red.500",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadNotifications(false);
  }, []);

  const handleNotificationPress = async (notification: SellerNotification) => {
    try {
      // Mark as read
      if (!notification.is_read) {
        const token = await getToken();
        if (token) {
          await markNotificationAsRead(token, notification.notification_id);

          // Update local state
          setNotifications((prev) =>
            prev.map((n) =>
              n.notification_id === notification.notification_id
                ? { ...n, is_read: true }
                : n,
            ),
          );
        }
      }

      // Navigate based on type
      if (notification.order_id) {
        if (notification.type === "RETURN_REQUEST") {
          router.push("/(seller)/returns" as any);
        } else {
          router.push("/(seller)/orders" as any);
        }
      } else if (notification.product_id) {
        router.push("/(seller)/products" as any);
      }
    } catch (error) {
      console.error("Error handling notification:", error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "เมื่อสักครู่";
    if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
    if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
    if (days < 7) return `${days} วันที่แล้ว`;

    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderNotification = ({ item }: { item: SellerNotification }) => {
    const icon = NOTIFICATION_ICONS[item.type] || "notifications";
    const color = NOTIFICATION_COLORS[item.type] || "#6b7280";

    return (
      <Pressable
        onPress={() => handleNotificationPress(item)}
        _pressed={{ opacity: 0.7 }}
      >
        <Box
          bg={item.is_read ? "white" : "violet.50"}
          borderLeftWidth={4}
          borderLeftColor={item.is_read ? "gray.300" : "violet.600"}
          mb={2}
          mx={4}
          rounded="lg"
          shadow={1}
        >
          <HStack space={3} p={4} alignItems="flex-start">
            {/* Icon */}
            <Box
              bg={`${color}20`}
              p={2}
              rounded="full"
              alignItems="center"
              justifyContent="center"
            >
              <Ionicons name={icon} size={24} color={color} />
            </Box>

            {/* Content */}
            <VStack flex={1} space={1}>
              <HStack justifyContent="space-between" alignItems="flex-start">
                <Text
                  fontSize="sm"
                  fontWeight="bold"
                  color={item.is_read ? "gray.700" : "violet.700"}
                  flex={1}
                >
                  {item.title}
                </Text>
                {!item.is_read && (
                  <Box
                    bg="violet.600"
                    w={2}
                    h={2}
                    rounded="full"
                    ml={2}
                    mt={1}
                  />
                )}
              </HStack>

              <Text
                fontSize="sm"
                color={item.is_read ? "gray.600" : "gray.700"}
                numberOfLines={2}
              >
                {item.message}
              </Text>

              <HStack alignItems="center" space={2} mt={1}>
                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                <Text fontSize="xs" color="gray.500">
                  {formatDate(item.created_at)}
                </Text>
              </HStack>
            </VStack>

            {/* Arrow */}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={item.is_read ? "#d1d5db" : "#7c3aed"}
            />
          </HStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <VStack flex={1}>
            <HStack alignItems="center" space={2}>
              <Text fontSize="lg" fontWeight="bold" color="white">
                การแจ้งเตือน
              </Text>
              {isConnected && (
                <Badge
                  bg="green.500"
                  _text={{ fontSize: "2xs", color: "white" }}
                  rounded="full"
                  px={2}
                  py={0.5}
                >
                  LIVE
                </Badge>
              )}
            </HStack>
            {notifications.length > 0 && (
              <Text fontSize="xs" color="white" opacity={0.8}>
                {notifications.filter((n) => !n.is_read).length}{" "}
                รายการยังไม่ได้อ่าน
              </Text>
            )}
          </VStack>
        </HStack>
      </Box>

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      ) : notifications.length === 0 ? (
        <Center flex={1}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color="#d1d5db"
          />
          <Text mt={4} color="gray.500">
            ไม่มีการแจ้งเตือน
          </Text>
          {isConnected && (
            <Text mt={2} fontSize="xs" color="green.500">
              🟢 เชื่อมต่อสำเร็จ - รอการแจ้งเตือนใหม่
            </Text>
          )}
        </Center>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
          ListHeaderComponent={
            notifications.some((n) => !n.is_read) ? (
              <Box px={4} pb={2}>
                <Text fontSize="xs" color="gray.500" fontWeight="bold">
                  ยังไม่ได้อ่าน
                </Text>
              </Box>
            ) : null
          }
        />
      )}
    </Box>
  );
}
