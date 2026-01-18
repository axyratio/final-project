// app/(tabs)/notification.tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  Notification,
} from "@/api/notification";
import { getToken } from "@/utils/secure-store";

export default function NotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);

    try {
      const token = await getToken();
      if (!token) return;

      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications(false);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const token = await getToken();
      if (!token) return;

      await markAsRead(token, notificationId);

      // อัปเดต state
      setNotifications((prev) =>
        prev.map((n) =>
          n.notification_id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = await getToken();
      if (!token) return;

      await markAllAsRead(token);

      // อัปเดต state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);

      Alert.alert("สำเร็จ", "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว");
    } catch (error) {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถทำเครื่องหมายได้");
    }
  };

  const handleDelete = async (notificationId: string) => {
    Alert.alert("ลบการแจ้งเตือน", "คุณแน่ใจหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;

            await deleteNotification(token, notificationId);

            // ลบออกจาก state
            setNotifications((prev) =>
              prev.filter((n) => n.notification_id !== notificationId)
            );
          } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบได้");
          }
        },
      },
    ]);
  };

  const handleNotificationPress = (notification: Notification) => {
    // ทำเครื่องหมายว่าอ่านแล้ว
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }

    // นำทางไปยังหน้าที่เกี่ยวข้อง
    if (notification.order_id) {
      router.push({
        pathname: "/(profile)/order-detail",
        params: { orderId: notification.order_id },
      });
    } else if (notification.conversation_id) {
      router.push({
        pathname: "/(chat)/chat",
        params: { conversationId: notification.conversation_id },
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
      ORDER_DELIVERED: "checkmark-circle",
      ORDER_SHIPPED: "car",
      ORDER_PREPARING: "cube",
      ORDER_PAID: "card",
      ORDER_COMPLETED: "checkmark-done-circle",
      ORDER_CANCELLED: "close-circle",
      NEW_MESSAGE: "chatbubble",
      PAYMENT_SUCCESS: "checkmark-circle",
      PAYMENT_FAILED: "close-circle",
      RETURN_APPROVED: "checkmark-circle",
      RETURN_REJECTED: "close-circle",
    };

    return iconMap[type] || "notifications";
  };

  const getNotificationColor = (type: string) => {
    const colorMap: Record<string, string> = {
      ORDER_DELIVERED: "#10b981",
      ORDER_SHIPPED: "#3b82f6",
      ORDER_PREPARING: "#f59e0b",
      ORDER_PAID: "#8b5cf6",
      ORDER_COMPLETED: "#10b981",
      ORDER_CANCELLED: "#ef4444",
      NEW_MESSAGE: "#3b82f6",
      PAYMENT_SUCCESS: "#10b981",
      PAYMENT_FAILED: "#ef4444",
      RETURN_APPROVED: "#10b981",
      RETURN_REJECTED: "#ef4444",
    };

    return colorMap[type] || "#6b7280";
  };

  const formatTime = (dateString: string) => {
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
    });
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationCard, !item.is_read && styles.unreadCard]}
      onPress={() => handleNotificationPress(item)}
    >
      <View style={styles.iconContainer}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: getNotificationColor(item.notification_type) },
          ]}
        >
          <Ionicons
            name={getNotificationIcon(item.notification_type)}
            size={24}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.unreadDot} />}
        </View>

        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>

        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>

      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
      )}

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDelete(item.notification_id)}
      >
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllButton}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>อ่านทั้งหมด</Text>
          </TouchableOpacity>
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>ไม่มีการแจ้งเตือน</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notification_id}
          renderItem={renderNotification}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#8b5cf6"]}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  markAllText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadCard: {
    backgroundColor: "#f3f4f6",
  },
  iconContainer: {
    marginRight: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8b5cf6",
    marginLeft: 8,
  },
  message: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#9ca3af",
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginLeft: 12,
  },
  deleteButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: "#9ca3af",
  },
});