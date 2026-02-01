// context/SellerNotificationContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { useSellerNotifications, SellerNotificationData } from '@/hooks/useSellerNotifications';
import { useRouter } from 'expo-router';

interface SellerNotificationContextType {
  isConnected: boolean;
  lastNotification: SellerNotificationData | null;
  notifications: SellerNotificationData[];
  clearNotifications: () => void;
}

const SellerNotificationContext = createContext<SellerNotificationContextType | undefined>(undefined);

export function SellerNotificationProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<SellerNotificationData[]>([]);

  const { isConnected, lastNotification } = useSellerNotifications({
    onNotification: (data) => {
      console.log('📢 New seller notification:', data);

      // เพิ่มการแจ้งเตือนเข้า list
      setNotifications((prev) => [data, ...prev].slice(0, 50)); // เก็บแค่ 50 รายการล่าสุด

      // แสดง native alert (สำหรับ testing)
      if (Platform.OS !== 'web') {
        Alert.alert(
          data.title || 'แจ้งเตือนใหม่',
          data.message || '',
          [
            { text: 'ปิด', style: 'cancel' },
            {
              text: 'ดูเพิ่มเติม',
              onPress: () => {
                // นำทางไปหน้าที่เกี่ยวข้อง
                if (data.order_id) {
                  router.push('/(seller)/orders' as any);
                } else if (data.return_id) {
                  router.push('/(seller)/returns' as any);
                } else if (data.product_id) {
                  router.push('/(seller)/products' as any);
                }
              },
            },
          ]
        );
      }
    },
    onConnected: () => {
      console.log('✅ Seller WebSocket connected');
    },
    onDisconnected: () => {
      console.log('❌ Seller WebSocket disconnected');
    },
    onError: (error) => {
      console.error('❌ Seller WebSocket error:', error);
    },
    autoReconnect: true,
    reconnectInterval: 5000,
  });

  const clearNotifications = () => {
    setNotifications([]);
  };

  return (
    <SellerNotificationContext.Provider
      value={{
        isConnected,
        lastNotification,
        notifications,
        clearNotifications,
      }}
    >
      {children}
    </SellerNotificationContext.Provider>
  );
}

export function useSellerNotificationContext() {
  const context = useContext(SellerNotificationContext);
  if (!context) {
    throw new Error('useSellerNotificationContext must be used within SellerNotificationProvider');
  }
  return context;
}