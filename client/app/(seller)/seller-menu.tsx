// app/(seller)/seller-menu.tsx
import { fetchSellerNotifications } from "@/api/seller";
import { Colors } from "@/constants/theme";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
    Badge,
    Box,
    HStack,
    Icon,
    Pressable,
    ScrollView,
    StatusBar,
    Text,
    VStack,
} from "native-base";
import React, { useEffect, useState } from "react";
import { useColorScheme } from "react-native";

type MenuItem = {
  id: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  badge?: number;
  color: string;
};

export default function SellerMenuScreen() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const router = useRouter();

  const [unreadCount, setUnreadCount] = useState(0);
  const [preparingCount, setPreparingCount] = useState(0);
  const [returnCount, setReturnCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const notifications = await fetchSellerNotifications(token);
      const unread = notifications.filter((n) => !n.is_read).length;
      setUnreadCount(unread);

      // TODO: Load preparing orders count and return requests count
      setPreparingCount(15); // Mock data
      setReturnCount(3); // Mock data
    } catch (error) {
      console.error("Error loading counts:", error);
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "store",
      title: "ร้านค้าของฉัน",
      subtitle: "จัดการข้อมูลร้านค้าและสินค้า",
      icon: "storefront",
      route: "/(store)/mystore",
      color: "#7c3aed",
    },
    {
      id: "orders",
      title: "การสั่งซื้อ",
      subtitle: "จัดการออเดอร์และการจัดส่ง",
      icon: "receipt",
      route: "/(seller)/orders",
      badge: preparingCount,
      color: "#f59e0b",
    },
    {
      id: "returns",
      title: "การคืนสินค้า",
      subtitle: "จัดการคำขอคืนสินค้า",
      icon: "return-down-back",
      route: "/(seller)/returns",
      badge: returnCount,
      color: "#ef4444",
    },
    {
      id: "dashboard",
      title: "Dashboard",
      subtitle: "สถิติและรายงานการขาย",
      icon: "analytics",
      route: "/(seller)/dashboard",
      color: "#10b981",
    },
    {
      id: "notifications",
      title: "การแจ้งเตือน",
      subtitle: "ข่าวสารและกิจกรรมของร้าน",
      icon: "notifications",
      route: "/(seller)/notifications",
      badge: unreadCount,
      color: "#3b82f6",
    },
  ];

  const renderMenuItem = (item: MenuItem) => (
    <Pressable
      key={item.id}
      onPress={() => router.push(item.route as any)}
      mb={3}
      _pressed={{ opacity: 0.7 }}
    >
      <Box
        bg="white"
        rounded="xl"
        p={4}
        shadow={2}
        borderLeftWidth={0}
        borderLeftColor={item.color}
      >
        <HStack alignItems="center" space={4}>
          {/* Icon */}
          <Box
            bg={`${item.color}15`}
            p={3}
            rounded="full"
          >
            <Icon
              as={Ionicons}
              name={item.icon}
              size="lg"
              color={item.color}
            />
          </Box>

          {/* Content */}
          <VStack flex={1}>
            <HStack alignItems="center" space={2}>
              <Text fontSize="md" fontWeight="bold" color="gray.800">
                {item.title}
              </Text>
              {item.badge && item.badge > 0 ? (
                <Badge
                  bg={item.color}
                  rounded="full"
                  _text={{ color: "white", fontSize: "xs", fontWeight: "bold" }}
                >
                  {item.badge}
                </Badge>
              ) : null}
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              {item.subtitle}
            </Text>
          </VStack>

          {/* Arrow */}
          <Icon
            as={Ionicons}
            name="chevron-forward"
            size="sm"
            color="gray.400"
          />
        </HStack>
      </Box>
    </Pressable>
  );

  return (
    <Box flex={1} bg="coolGray.50">
      <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
      <Box safeAreaTop bg="violet.600" />

      {/* Header */}
      <Box bg="violet.600" px={4} py={4}>
        <HStack alignItems="center" space={3}>
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </Pressable>
          <VStack flex={1}>
            <Text fontSize="xl" fontWeight="bold" color="white">
              Seller Menu
            </Text>
            <Text fontSize="xs" color="white" opacity={0.8}>
              จัดการร้านค้าของคุณ
            </Text>
          </VStack>
          <Pressable onPress={() => router.push("/(seller)/notifications" as any)}>
            <Box position="relative">
              <Ionicons name="notifications-outline" size={24} color="white" />
              {unreadCount > 0 && (
                <Box
                  position="absolute"
                  top={-4}
                  right={-4}
                  bg="red.500"
                  rounded="full"
                  minW={5}
                  h={5}
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text color="white" fontSize="xs" fontWeight="bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Text>
                </Box>
              )}
            </Box>
          </Pressable>
        </HStack>
      </Box>

      {/* Menu Items */}
      <ScrollView showsVerticalScrollIndicator={false}>
        <VStack p={4} space={0}>
          {menuItems.map(renderMenuItem)}
        </VStack>
      </ScrollView>
    </Box>
  );
}


// แบบดึง API ทั้งตำบล
// app/(seller)/seller-menu.tsx
// import { fetchSellerNotifications, fetchSellerDashboard } from "@/api/seller";
// import { Colors } from "@/constants/theme";
// import { getToken } from "@/utils/secure-store";
// import { Ionicons } from "@expo/vector-icons";
// import { useRouter } from "expo-router";
// import {
//   Badge,
//   Box,
//   HStack,
//   Icon,
//   Pressable,
//   ScrollView,
//   StatusBar,
//   Text,
//   VStack,
//   Spinner,
//   Center,
// } from "native-base";
// import React, { useEffect, useState } from "react";
// import { useColorScheme } from "react-native";

// type MenuItem = {
//   id: string;
//   title: string;
//   subtitle: string;
//   icon: keyof typeof Ionicons.glyphMap;
//   route: string;
//   badge?: number;
//   color: string;
// };

// export default function SellerMenuScreen() {
//   const colorScheme = useColorScheme();
//   const themeColors = Colors[colorScheme ?? "light"];
//   const router = useRouter();

//   // ✅ State สำหรับ Badge counts
//   const [unreadCount, setUnreadCount] = useState(0);
//   const [preparingCount, setPreparingCount] = useState(0);
//   const [returnCount, setReturnCount] = useState(0);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     loadCounts();
//   }, []);

//   const loadCounts = async () => {
//     try {
//       setLoading(true);
//       setError(null);

//       const token = await getToken();
//       if (!token) {
//         router.replace("/login");
//         return;
//       }

//       // ✅ 1. โหลดการแจ้งเตือนที่ยังไม่ได้อ่าน
//       const notifications = await fetchSellerNotifications(token);
//       const unread = notifications.filter((n) => !n.is_read).length;
//       setUnreadCount(unread);

//       // ✅ 2. โหลด Dashboard เพื่อดึงข้อมูล order และ return
//       const dashboardData = await fetchSellerDashboard(token);
      
//       // ✅ 3. จำนวน order ที่กำลังเตรียม (PREPARING)
//       setPreparingCount(dashboardData.order_status_count.preparing);

//       // ✅ 4. จำนวนคำขอคืนสินค้าที่รอดำเนินการ (PENDING)
//       setReturnCount(dashboardData.pending_returns);

//     } catch (error: any) {
//       console.error("❌ Error loading counts:", error);
//       setError(error.message || "ไม่สามารถโหลดข้อมูลได้");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const menuItems: MenuItem[] = [
//     {
//       id: "store",
//       title: "ร้านค้าของฉัน",
//       subtitle: "จัดการข้อมูลร้านค้าและสินค้า",
//       icon: "storefront",
//       route: "/(store)/mystore",
//       color: "#7c3aed",
//     },
//     {
//       id: "orders",
//       title: "การสั่งซื้อ",
//       subtitle: "จัดการออเดอร์และการจัดส่ง",
//       icon: "receipt",
//       route: "/(seller)/orders",
//       badge: preparingCount, // ✅ แสดงจำนวนจริงจาก API
//       color: "#f59e0b",
//     },
//     {
//       id: "returns",
//       title: "การคืนสินค้า",
//       subtitle: "จัดการคำขอคืนสินค้า",
//       icon: "return-down-back",
//       route: "/(seller)/returns",
//       badge: returnCount, // ✅ แสดงจำนวนจริงจาก API
//       color: "#ef4444",
//     },
//     {
//       id: "dashboard",
//       title: "Dashboard",
//       subtitle: "สถิติและรายงานการขาย",
//       icon: "analytics",
//       route: "/(seller)/dashboard",
//       color: "#10b981",
//     },
//     {
//       id: "notifications",
//       title: "การแจ้งเตือน",
//       subtitle: "ข่าวสารและกิจกรรมของร้าน",
//       icon: "notifications",
//       route: "/(seller)/notifications",
//       badge: unreadCount, // ✅ แสดงจำนวนจริงจาก API
//       color: "#3b82f6",
//     },
//   ];

//   const renderMenuItem = (item: MenuItem) => (
//     <Pressable
//       key={item.id}
//       onPress={() => router.push(item.route as any)}
//       mb={3}
//       _pressed={{ opacity: 0.7 }}
//     >
//       <Box
//         bg="white"
//         rounded="xl"
//         p={4}
//         shadow={2}
//         borderLeftWidth={4}
//         borderLeftColor={item.color}
//       >
//         <HStack alignItems="center" space={4}>
//           {/* Icon */}
//           <Box bg={`${item.color}15`} p={3} rounded="full">
//             <Icon as={Ionicons} name={item.icon} size="lg" color={item.color} />
//           </Box>

//           {/* Content */}
//           <VStack flex={1}>
//             <HStack alignItems="center" space={2}>
//               <Text fontSize="md" fontWeight="bold" color="gray.800">
//                 {item.title}
//               </Text>
//               {/* ✅ แสดง Badge เฉพาะเมื่อมีจำนวน > 0 */}
//               {item.badge && item.badge > 0 ? (
//                 <Badge
//                   bg={item.color}
//                   rounded="full"
//                   _text={{
//                     color: "white",
//                     fontSize: "xs",
//                     fontWeight: "bold",
//                   }}
//                 >
//                   {item.badge > 99 ? "99+" : item.badge}
//                 </Badge>
//               ) : null}
//             </HStack>
//             <Text fontSize="xs" color="gray.500" mt={0.5}>
//               {item.subtitle}
//             </Text>
//           </VStack>

//           {/* Arrow */}
//           <Icon as={Ionicons} name="chevron-forward" size="sm" color="gray.400" />
//         </HStack>
//       </Box>
//     </Pressable>
//   );

//   return (
//     <Box flex={1} bg="coolGray.50">
//       <StatusBar backgroundColor="#7c3aed" barStyle="light-content" />
//       <Box safeAreaTop bg="violet.600" />

//       {/* Header */}
//       <Box bg="violet.600" px={4} py={4}>
//         <HStack alignItems="center" space={3}>
//           <Pressable onPress={() => router.back()}>
//             <Ionicons name="arrow-back" size={24} color="white" />
//           </Pressable>
//           <VStack flex={1}>
//             <Text fontSize="xl" fontWeight="bold" color="white">
//               Seller Menu
//             </Text>
//             <Text fontSize="xs" color="white" opacity={0.8}>
//               จัดการร้านค้าของคุณ
//             </Text>
//           </VStack>
//           <Pressable onPress={() => router.push("/(seller)/notifications" as any)}>
//             <Box position="relative">
//               <Ionicons name="notifications-outline" size={24} color="white" />
//               {/* ✅ แสดง Badge จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน */}
//               {unreadCount > 0 && (
//                 <Box
//                   position="absolute"
//                   top={-4}
//                   right={-4}
//                   bg="red.500"
//                   rounded="full"
//                   minW={5}
//                   h={5}
//                   alignItems="center"
//                   justifyContent="center"
//                 >
//                   <Text color="white" fontSize="xs" fontWeight="bold">
//                     {unreadCount > 9 ? "9+" : unreadCount}
//                   </Text>
//                 </Box>
//               )}
//             </Box>
//           </Pressable>
//         </HStack>
//       </Box>

//       {/* Content */}
//       {loading ? (
//         // ✅ Loading State
//         <Center flex={1}>
//           <Spinner size="lg" color="violet.600" />
//           <Text mt={2} color="gray.500">
//             กำลังโหลดข้อมูล...
//           </Text>
//         </Center>
//       ) : error ? (
//         // ✅ Error State
//         <Center flex={1} px={4}>
//           <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
//           <Text mt={4} fontSize="md" color="gray.700" textAlign="center">
//             {error}
//           </Text>
//           <Pressable
//             mt={4}
//             px={6}
//             py={3}
//             bg="violet.600"
//             rounded="lg"
//             onPress={loadCounts}
//           >
//             <Text color="white" fontWeight="bold">
//               ลองใหม่อีกครั้ง
//             </Text>
//           </Pressable>
//         </Center>
//       ) : (
//         // ✅ Menu Items
//         <ScrollView showsVerticalScrollIndicator={false}>
//           <VStack p={4} space={0}>
//             {menuItems.map(renderMenuItem)}
//           </VStack>

//           {/* ✅ เพิ่มปุ่ม Refresh (Optional) */}
//           <Box px={4} pb={4}>
//             <Pressable
//               onPress={loadCounts}
//               bg="white"
//               rounded="lg"
//               p={3}
//               borderWidth={1}
//               borderColor="coolGray.200"
//               _pressed={{ opacity: 0.7 }}
//             >
//               <HStack alignItems="center" justifyContent="center" space={2}>
//                 <Ionicons name="refresh-outline" size={18} color="#7c3aed" />
//                 <Text fontSize="sm" color="violet.600" fontWeight="medium">
//                   รีเฟรชข้อมูล
//                 </Text>
//               </HStack>
//             </Pressable>
//           </Box>
//         </ScrollView>
//       )}
//     </Box>
//   );
// }