import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';



export default function TabLayout() {
  const colorScheme = useColorScheme();

  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs

      screenOptions={{
        tabBarInactiveTintColor: themeColors.icon,
        tabBarActiveTintColor: themeColors.tint,
        tabBarLabelStyle: { fontSize: 9 },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
  name="index"
  options={{
    title: "Home",
    tabBarLabel: 'หน้าแรก',
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="house.fill" color={color} />
    ),
  }}
/>

      <Tabs.Screen
        name="profile"
        options={{
          title: 'โปรไฟล์',
          tabBarLabel: 'โปรไฟล์',
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'} // icon เปลี่ยนตาม active
              size={size}
              color={color} // ใช้ color จาก theme/activeTint
            />
          ),
          
        }}
      />

    </Tabs>
  );
}
