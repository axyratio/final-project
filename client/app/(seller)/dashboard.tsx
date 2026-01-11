// app/(seller)/dashboard.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  HStack,
  VStack,
  Text,
  Pressable,
  ScrollView,
  StatusBar,
  Spinner,
  Center,
  Image,
  Select,
} from "native-base";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Dimensions } from "react-native";
import { fetchSellerDashboard, DashboardData } from "@/api/seller";
import { getToken } from "@/utils/secure-store";

const { width } = Dimensions.get("window");

export default function SellerDashboardScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("2025-01");
  const [selectedCategory, setSelectedCategory] = useState("ALL");

  useEffect(() => {
    loadDashboard();
  }, [selectedMonth]);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const token = await getToken();
      if (!token) {
        router.replace("/login");
        return;
      }

      const data = await fetchSellerDashboard(token, selectedMonth);
      setDashboard(data);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStatCard = (
    title: string,
    value: number,
    change: number,
    color: string
  ) => (
    <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
      <Text fontSize="xs" color="gray.500" mb={1}>
        {title}
      </Text>
      <Text fontSize="xl" fontWeight="bold" color={color}>
        ฿{value.toLocaleString()}
      </Text>
      <HStack alignItems="center" space={1} mt={1}>
        <Ionicons
          name={change >= 0 ? "trending-up" : "trending-down"}
          size={14}
          color={change >= 0 ? "#10b981" : "#ef4444"}
        />
        <Text
          fontSize="xs"
          color={change >= 0 ? "green.600" : "red.600"}
          fontWeight="bold"
        >
          {change >= 0 ? "+" : ""}
          {change.toFixed(1)}%
        </Text>
      </HStack>
    </Box>
  );

  const renderSalesChart = () => {
    if (!dashboard) return null;

    const maxSales = Math.max(...dashboard.sales_chart.map((d) => d.sales));
    const chartHeight = 120;

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={4}>
          ยอดขายรายวัน (7 วันล่าสุด)
        </Text>

        {/* Chart */}
        <HStack alignItems="flex-end" justifyContent="space-between" h={chartHeight}>
          {dashboard.sales_chart.map((item, index) => {
            const barHeight = (item.sales / maxSales) * chartHeight;
            return (
              <VStack key={index} alignItems="center" flex={1}>
                {/* Bar */}
                <Box
                  bg="violet.500"
                  w="80%"
                  h={barHeight}
                  rounded="sm"
                  mb={2}
                />
                {/* Label */}
                <Text fontSize="xs" color="gray.500">
                  {item.date}
                </Text>
              </VStack>
            );
          })}
        </HStack>

        {/* Values */}
        <HStack justifyContent="space-between" mt={3}>
          <Text fontSize="xs" color="gray.500">
            0
          </Text>
          <Text fontSize="xs" color="gray.500">
            {(maxSales / 1000).toFixed(1)}K
          </Text>
        </HStack>
      </Box>
    );
  };

  const renderTopProducts = () => {
    if (!dashboard) return null;

    const filteredProducts =
      selectedCategory === "ALL"
        ? dashboard.top_products
        : dashboard.top_products.filter((p) => p.category === selectedCategory);

    // Get unique categories
    const categories = ["ALL", ...Array.from(new Set(dashboard.top_products.map((p) => p.category)))];

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <HStack justifyContent="space-between" alignItems="center" mb={4}>
          <Text fontSize="md" fontWeight="bold" color="gray.800">
            สินค้าขายดี
          </Text>
          <Select
            selectedValue={selectedCategory}
            onValueChange={setSelectedCategory}
            w="140px"
            h="35px"
            fontSize="xs"
          >
            {categories.map((cat) => (
              <Select.Item
                key={cat}
                label={cat === "ALL" ? "ทั้งหมด" : cat}
                value={cat}
              />
            ))}
          </Select>
        </HStack>

        {filteredProducts.map((product, index) => (
          <HStack key={product.product_id} space={3} mb={3} alignItems="center">
            {/* Rank */}
            <Center
              w="30px"
              h="30px"
              bg={index === 0 ? "yellow.400" : index === 1 ? "gray.400" : "orange.400"}
              rounded="full"
            >
              <Text fontSize="xs" fontWeight="bold" color="white">
                {index + 1}
              </Text>
            </Center>

            {/* Image */}
            <Image
              source={{ uri: product.image_url }}
              alt={product.product_name}
              size="50px"
              rounded="md"
            />

            {/* Info */}
            <VStack flex={1}>
              <Text fontSize="sm" color="gray.800" numberOfLines={1}>
                {product.product_name}
              </Text>
              <Text fontSize="xs" color="gray.500">
                ขายแล้ว {product.sold_count} ชิ้น
              </Text>
            </VStack>

            {/* Revenue */}
            <VStack alignItems="flex-end">
              <Text fontSize="sm" fontWeight="bold" color="violet.600">
                ฿{(product.revenue / 1000).toFixed(1)}K
              </Text>
            </VStack>
          </HStack>
        ))}
      </Box>
    );
  };

  const renderOrderStatusCount = () => {
    if (!dashboard) return null;

    const statuses = [
      { label: "กำลังเตรียม", count: dashboard.order_status_count.preparing, color: "#f59e0b" },
      { label: "จัดส่งแล้ว", count: dashboard.order_status_count.shipped, color: "#3b82f6" },
      { label: "สำเร็จ", count: dashboard.order_status_count.completed, color: "#10b981" },
    ];

    return (
      <Box bg="white" rounded="lg" p={4} shadow={1} mb={4}>
        <Text fontSize="md" fontWeight="bold" color="gray.800" mb={4}>
          สถานะออเดอร์
        </Text>
        <HStack justifyContent="space-between">
          {statuses.map((status) => (
            <VStack key={status.label} alignItems="center" flex={1}>
              <Box
                w="50px"
                h="50px"
                bg={`${status.color}20`}
                rounded="full"
                alignItems="center"
                justifyContent="center"
                mb={2}
              >
                <Text fontSize="lg" fontWeight="bold" color={status.color}>
                  {status.count}
                </Text>
              </Box>
              <Text fontSize="xs" color="gray.600" textAlign="center">
                {status.label}
              </Text>
            </VStack>
          ))}
        </HStack>
      </Box>
    );
  };

  const renderQuickStats = () => {
    if (!dashboard) return null;

    return (
      <HStack space={3} mb={4}>
        <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
          <HStack alignItems="center" space={2}>
            <Box bg="blue.100" p={2} rounded="full">
              <Ionicons name="people" size={20} color="#3b82f6" />
            </Box>
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.500">
                ลูกค้าทั้งหมด
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {dashboard.total_customers}
              </Text>
            </VStack>
          </HStack>
        </Box>

        <Box flex={1} bg="white" rounded="lg" p={4} shadow={1}>
          <HStack alignItems="center" space={2}>
            <Box bg="red.100" p={2} rounded="full">
              <Ionicons name="return-down-back" size={20} color="#ef4444" />
            </Box>
            <VStack flex={1}>
              <Text fontSize="xs" color="gray.500">
                รอคืนสินค้า
              </Text>
              <Text fontSize="lg" fontWeight="bold" color="gray.800">
                {dashboard.pending_returns}
              </Text>
            </VStack>
          </HStack>
        </Box>
      </HStack>
    );
  };

  if (loading) {
    return (
      <Box flex={1} bg="coolGray.50">
        <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
        <Box safeAreaTop bg="violet.600" />
        <Center flex={1}>
          <Spinner size="lg" color="violet.600" />
        </Center>
      </Box>
    );
  }

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={3}>
        <HStack alignItems="center" space={3} mb={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <Text fontSize="lg" fontWeight="bold" color="white" flex={1}>
            Dashboard
          </Text>
          <Select
            selectedValue={selectedMonth}
            onValueChange={setSelectedMonth}
            w="120px"
            h="35px"
            bg="white"
            color="violet.600"
            fontSize="xs"
          >
            <Select.Item label="มกราคม 2025" value="2025-01" />
            <Select.Item label="ธันวาคม 2024" value="2024-12" />
            <Select.Item label="พฤศจิกายน 2024" value="2024-11" />
          </Select>
        </HStack>
      </Box>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack p={4} space={4}>
          {/* Sales Stats */}
          <HStack space={3}>
            {dashboard && (
              <>
                {renderStatCard("วันนี้", dashboard.sales_stats.today, dashboard.sales_stats.change_today, "#7c3aed")}
                {renderStatCard("สัปดาห์นี้", dashboard.sales_stats.week, dashboard.sales_stats.change_week, "#f59e0b")}
                {renderStatCard("เดือนนี้", dashboard.sales_stats.month, dashboard.sales_stats.change_month, "#10b981")}
              </>
            )}
          </HStack>

          {/* Sales Chart */}
          {renderSalesChart()}

          {/* Quick Stats */}
          {renderQuickStats()}

          {/* Order Status */}
          {renderOrderStatusCount()}

          {/* Top Products */}
          {renderTopProducts()}
        </VStack>
      </ScrollView>
    </Box>
  );
}