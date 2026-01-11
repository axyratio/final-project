// app/(profile)/orders.tsx
import {
  confirmOrderReceived,
  fetchUserOrders,
  Order,
  OrderStatus,
  reorderItems,
} from "@/api/order";
import { OrderCard } from "@/components/profile/order-card";
import { OrderEmptyState } from "@/components/profile/order-empty-state";
import { Colors } from "@/constants/theme";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  Box,
  Center,
  HStack,
  Pressable,
  ScrollView,
  Spinner,
  StatusBar,
  Text,
  useToast,
} from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, useColorScheme } from "react-native";

// ✅ 1. ปรับปรุง TabType และ TABS ให้รองรับสถานะการคืนสินค้าที่ครบถ้วน (RETURNING, APPROVED, REJECTED, RETURNED)
type TabType = "ALL" | "PREPARING" | "SHIPPED" | "DELIVERED" | "RETURNING" | "CANCELLED";

const TABS: { key: TabType; label: string; statuses?: OrderStatus[] }[] = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "PREPARING", label: "กำลังเตรียม", statuses: ["PREPARING", "PAID"] },
  { key: "SHIPPED", label: "กำลังจัดส่ง", statuses: ["SHIPPED"] },
  { 
    key: "DELIVERED", 
    label: "จัดส่งสำเร็จ", 
    statuses: ["DELIVERED", "COMPLETED"] 
  },
  { 
    key: "RETURNING", 
    label: "การคืนสินค้า", 
    // ✅ รวมสถานะที่เกี่ยวกับการคืนทั้งหมดไว้ใน Tab เดียวกัน
    statuses: ["RETURNING", "APPROVED", "REJECTED", "RETURNED"] 
  },
  { key: "CANCELLED", label: "ยกเลิก", statuses: ["CANCELLED"] },
];

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("ALL");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ----------------
  // Fetch orders
  // ----------------
  const loadOrders = useCallback(
    async (showLoading = true) => {
      try {
        if (showLoading) {
          setLoading(true);
          setError(null);
        }

        const token = await getToken();
        if (!token) {
          router.replace("/login");
          return;
        }

        const selectedTab = TABS.find((t) => t.key === activeTab);
        let fetchedOrders: Order[] = [];
        
        // ✅ 2. ปรับ Logic การดึงข้อมูล: รองรับการดึงข้อมูลหลายสถานะพร้อมกันด้วย Promise.all
        if (activeTab === "ALL") {
          const response = await fetchUserOrders(token);
          fetchedOrders = response?.orders || [];
        } else {
          const statuses = selectedTab?.statuses || [];
          
          // ดึงข้อมูลทุกสถานะที่อยู่ใน Tab นั้นๆ พร้อมกัน
          const responses = await Promise.all(
            statuses.map(status => fetchUserOrders(token, status))
          );

          // รวม Array ของ Order จากทุก Response เข้าด้วยกัน
          responses.forEach(res => {
            if (res?.orders) {
              fetchedOrders = [...fetchedOrders, ...res.orders];
            }
          });
        }

        // ✅ 3. ระบบป้องกัน Duplicate Key: กรอง Order ID ที่ซ้ำกันออก (ป้องกันแอปค้าง/Crash)
        const uniqueOrders = Array.from(
          new Map(fetchedOrders.map((item) => [item.order_id, item])).values()
        );

        // ✅ 4. จัดเรียงข้อมูลตามวันที่สร้าง (ใหม่ที่สุดขึ้นก่อน)
        uniqueOrders.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setOrders(uniqueOrders);
        setError(null);
      } catch (error: any) {
        console.error("❌ Error loading orders:", error);
        
        const errorMessage = error.response?.data?.detail || 
                            error.response?.data?.message || 
                            error.message || 
                            "ไม่สามารถโหลดข้อมูลได้";
        
        setError(errorMessage);
        setOrders([]);
        
        toast.show({
          description: errorMessage,
          duration: 3000,
          bg: "red.500",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, router, toast]
  );

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  // ----------------
  // Pull to refresh
  // ----------------
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrders(false);
  }, [loadOrders]);

  // ----------------
  // Handle confirm received
  // ----------------
  const handleConfirmReceived = async (orderId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const result = await confirmOrderReceived(token, orderId);

      toast.show({
        description: result.message || "ยืนยันการรับสินค้าสำเร็จ",
        duration: 2000,
        bg: "green.500",
      });

      loadOrders(false);
    } catch (error: any) {
      console.error("❌ Error confirming order:", error);
      const errorMessage = error.response?.data?.detail || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      toast.show({ description: errorMessage, duration: 3000, bg: "red.500" });
    }
  };

  // ----------------
  // Handle reorder
  // ----------------
  const handleReorder = async (orderId: string) => {
    try {
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const result = await reorderItems(token, orderId);

      toast.show({
        description: result.message || "เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
        duration: 2000,
        bg: "green.500",
      });

      router.push("/(cart)/cart");
    } catch (error: any) {
      const errorMessage = error.response?.data?.detail || "เกิดข้อผิดพลาด กรุณาลองใหม่";
      toast.show({ description: errorMessage, duration: 3000, bg: "red.500" });
    }
  };

  const handleReturn = (orderId: string) => {
    router.push(`/(profile)/return-order?orderId=${orderId}` as any);
  };

  const handleReview = (orderId: string, productId: string) => {
    router.push(`/(home)/review-detail?productId=${productId}&orderId=${orderId}` as any);
  };

  // ----------------
  // Render tab button
  // ----------------
  const renderTabButton = (tab: typeof TABS[0]) => {
    const isActive = activeTab === tab.key;
    return (
      <Pressable
        key={tab.key}
        onPress={() => setActiveTab(tab.key)}
        px={4}
        py={2}
        borderBottomWidth={2}
        borderBottomColor={isActive ? "violet.600" : "transparent"}
      >
        <Text
          fontSize="xs"
          fontWeight={isActive ? "bold" : "normal"}
          color={isActive ? "violet.600" : "gray.500"}
          numberOfLines={1}
        >
          {tab.label}
        </Text>
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
          <Text fontSize="lg" fontWeight="bold" color="white">
            การซื้อของฉัน
          </Text>
        </HStack>
      </Box>

      {/* Tabs */}
      <Box bg="white" borderBottomWidth={1} borderBottomColor="coolGray.200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <HStack>{TABS.map(renderTabButton)}</HStack>
        </ScrollView>
      </Box>

      {/* Content */}
      {loading ? (
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
          <Text mt={2} color="gray.500">กำลังโหลด...</Text>
        </Center>
      ) : error ? (
        <Center flex={1} px={4}>
          <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
          <Text mt={4} fontSize="md" color="gray.700" textAlign="center">{error}</Text>
          <Pressable mt={4} px={6} py={3} bg="violet.600" rounded="lg" onPress={() => loadOrders()}>
            <Text color="white" fontWeight="bold">ลองใหม่อีกครั้ง</Text>
          </Pressable>
        </Center>
      ) : orders.length === 0 ? (
        // ✅ 5. ปรับข้อความ Empty State ให้ตรงกับ Tab ที่เลือก
        <OrderEmptyState message={`ยังไม่มีรายการในหมวด${TABS.find(t => t.key === activeTab)?.label}`} />
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.order_id} // ✅ มั่นใจได้ว่า Key ไม่ซ้ำแน่นอนเพราะมี Logic Deduplicate ด้านบน
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onConfirmReceived={handleConfirmReceived}
              onReorder={handleReorder}
              onReview={handleReview}
              onReturn={handleReturn}
            />
          )}
          contentContainerStyle={{ padding: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#7c3aed"]}
            />
          }
        />
      )}
    </Box>
  );
}