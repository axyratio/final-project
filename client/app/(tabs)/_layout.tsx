// app/(tabs)/_layout.tsx
import { fetchUnreadCount } from "@/api/notification";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

// Badge Component
function TabBarBadge({ count }: { count: number }) {
  if (count === 0) return null;

  const displayCount = count > 99 ? "99+" : count.toString();

  return (
    <View style={styles.badge}>
      <Text style={styles.badgeText}>{displayCount}</Text>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const themeColors = Colors[colorScheme ?? "light"];
  const [unreadCount, setUnreadCount] = useState(0);

  const loadUnreadCount = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const count = await fetchUnreadCount(token);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  // โหลดครั้งแรก
  useEffect(() => {
    loadUnreadCount();

    // Auto refresh ทุก 30 วินาที
    const interval = setInterval(loadUnreadCount, 30000);

    return () => clearInterval(interval);
  }, []);

  // Refresh เมื่อกลับมาที่ Tab
  useFocusEffect(
    useCallback(() => {
      loadUnreadCount();
    }, []),
  );

  return (
    <Tabs
      screenOptions={{
        tabBarInactiveTintColor: themeColors.icon,
        tabBarActiveTintColor: themeColors.tint,
        tabBarLabelStyle: { fontSize: 9 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarLabel: "หน้าแรก",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

            <Tabs.Screen
        name="chat"
        options={{
          title: "แชท",
          tabBarLabel: "แชท",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="vton"
        options={{
          title: "ลองชุด",
          tabBarLabel: "ลองชุด",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "shirt" : "shirt-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* ✅ เพิ่ม Notification Tab พร้อม Badge */}
      <Tabs.Screen
        name="notification"
        options={{
          title: "การแจ้งเตือน",
          tabBarLabel: "แจ้งเตือน",
          tabBarIcon: ({ focused, color, size }) => (
            <View>
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={size}
                color={color}
              />
              <TabBarBadge count={unreadCount} />
            </View>
          ),
        }}
        listeners={{
          tabPress: () => {
            // รีเซ็ต badge เมื่อเข้าหน้า notification
            setUnreadCount(0);
          },
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "โปรไฟล์",
          tabBarLabel: "โปรไฟล์",
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={size}
              color={color}
            />
          ),
        }}
      />


    </Tabs>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    right: -10,
    top: -5,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});
