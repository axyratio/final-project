// ============================================================
// ไฟล์: client/app/(tabs)/notification.tsx (แทนที่ทั้งไฟล์)
// UI สำหรับแสดง notification 4 เหตุการณ์หลัก
// ============================================================

import {
  connectNotificationWS,
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  Notification,
} from "@/api/notification";
import { getToken } from "@/utils/secure-store";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function NotificationScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsCleanupRef = useRef<(() => void) | null>(null);

  // ── WebSocket: เปิดครั้งเดียว mount เท่านั้น ──
  useEffect(() => {
    let active = true;

    const startWS = async () => {
      const token = await getToken();
      if (!token || !active) return;

      wsCleanupRef.current = connectNotificationWS(token, (event) => {
        if (!active) return;
        console.log("🔔 Notification received:", event.notification);
        setNotifications((prev) => [event.notification, ...prev]);
        setUnreadCount(event.unread_count);
      });
    };

    startWS();

    return () => {
      active = false;
      if (wsCleanupRef.current) {
        wsCleanupRef.current();
        wsCleanupRef.current = null;
      }
    };
  }, []);

  // ── REST: โหลดใหม่ทุกครั้งที่กลับมา tab ──
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadREST = async () => {
        try {
          const token = await getToken();
          if (!token || cancelled) return;

          const data = await fetchNotifications(token);
          if (cancelled) return;

          setNotifications(data.notifications);
          setUnreadCount(data.unread_count);
        } catch (e) {
          console.error("loadREST:", e);
        } finally {
          if (!cancelled) {
            setLoading(false);
            setRefreshing(false);
          }
        }
      };

      loadREST();

      return () => {
        cancelled = true;
      };
    }, []),
  );

  // ── pull-to-refresh ──
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await getToken();
      if (!token) return;
      const data = await fetchNotifications(token);
      setNotifications(data.notifications);
      setUnreadCount(data.unread_count);
    } catch (e) {
      console.error("refresh:", e);
    } finally {
      setRefreshing(false);
    }
  };

  // ── อ่านแล้ว (optimistic) ──
  const handleMarkAsRead = async (notificationId: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.notification_id === notificationId ? { ...n, is_read: true } : n,
      ),
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
    try {
      const token = await getToken();
      if (token) await markAsRead(token, notificationId);
    } catch (e) {
      console.error("markAsRead:", e);
    }
  };

  // ── อ่านทั้งหมด ──
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
    try {
      const token = await getToken();
      if (token) await markAllAsRead(token);
      Alert.alert("สำเร็จ", "ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว");
    } catch {
      Alert.alert("ข้อผิดพลาด", "ไม่สามารถทำเครื่องหมายได้");
    }
  };

  // ── ลบ ──
  const handleDelete = (notificationId: string) => {
    Alert.alert("ลบการแจ้งเตือน", "คุณแน่ใจหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: async () => {
          setNotifications((prev) =>
            prev.filter((n) => n.notification_id !== notificationId),
          );
          try {
            const token = await getToken();
            if (token) await deleteNotification(token, notificationId);
          } catch {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถลบได้");
          }
        },
      },
    ]);
  };

  // ── tap → อ่านแล้ว + navigate ──
  const handleNotificationPress = (notification: Notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.notification_id);
    }
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

  // ── icon / color สำหรับ 4 เหตุการณ์หลัก ──
  const getNotificationIcon = (
    type: string,
  ): keyof typeof Ionicons.glyphMap => {
    const map: Record<string, keyof typeof Ionicons.glyphMap> = {
      ORDER_DELIVERED: "checkmark-circle",        // 1. จัดส่งสำเร็จ ✅
      ORDER_CANCELLED: "close-circle",            // 2. ร้านยกเลิก ❌
      ORDER_PREPARING: "cube",                    // 3. อนุมัติออเดอร์ 📦
      RETURN_APPROVED: "checkmark-done-circle",   // 4. อนุมัติคืนสินค้า ✅✅
      
      // อื่นๆ
      ORDER_SHIPPED: "car",
      ORDER_PAID: "card",
      ORDER_COMPLETED: "checkmark-done-circle",
      NEW_MESSAGE: "chatbubble",
      PAYMENT_SUCCESS: "checkmark-circle",
      PAYMENT_FAILED: "close-circle",
      RETURN_REJECTED: "close-circle",
    };
    return map[type] || "notifications";
  };

  const getNotificationColor = (type: string): string => {
    const map: Record<string, string> = {
      ORDER_DELIVERED: "#10b981",        // 1. เขียว - สำเร็จ ✅
      ORDER_CANCELLED: "#ef4444",        // 2. แดง - ยกเลิก ❌
      ORDER_PREPARING: "#f59e0b",        // 3. ส้ม - กำลังเตรียม 📦
      RETURN_APPROVED: "#10b981",        // 4. เขียว - อนุมัติคืนสินค้า ✅
      
      // อื่นๆ
      ORDER_SHIPPED: "#3b82f6",          // น้ำเงิน - จัดส่งแล้ว
      ORDER_PAID: "#8b5cf6",             // ม่วง - ชำระเงิน
      ORDER_COMPLETED: "#10b981",        // เขียว - สมบูรณ์
      NEW_MESSAGE: "#3b82f6",            // น้ำเงิน - ข้อความ
      PAYMENT_SUCCESS: "#10b981",        // เขียว
      PAYMENT_FAILED: "#ef4444",         // แดง
      RETURN_REJECTED: "#ef4444",        // แดง - ปฏิเสธคืนสินค้า
    };
    return map[type] || "#6b7280";
  };

  const formatTime = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime();
    const m = Math.floor(diff / 60000);
    const h = Math.floor(diff / 3600000);
    const d = Math.floor(diff / 86400000);
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    if (d < 7) return `${d} วันที่แล้ว`;
    return new Date(dateString).toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
    });
  };

  // ── render item ──
  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.card, !item.is_read && styles.cardUnread]}
      onPress={() => handleNotificationPress(item)}
    >
      {/* Icon Circle */}
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

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          {!item.is_read && <View style={styles.dot} />}
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.time}>{formatTime(item.created_at)}</Text>
      </View>

      {/* Thumbnail */}
      {item.image_url && (
        <Image source={{ uri: item.image_url }} style={styles.thumbnail} />
      )}

      {/* Delete Button */}
      <TouchableOpacity
        style={styles.deleteBtn}
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
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>การแจ้งเตือน</Text>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.markAllBtn}
            onPress={handleMarkAllAsRead}
          >
            <Text style={styles.markAllText}>อ่านทั้งหมด ({unreadCount})</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      {notifications.length === 0 ? (
        <View style={styles.center}>
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
  container: { flex: 1, backgroundColor: "#f9fafb" },
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
  headerTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#8b5cf6",
    borderRadius: 8,
  },
  markAllText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { padding: 16 },
  card: {
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
  cardUnread: { backgroundColor: "#f3f4f6" },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  content: { flex: 1 },
  titleRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  title: { fontSize: 16, fontWeight: "600", color: "#111827", flex: 1 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8b5cf6",
    marginLeft: 8,
  },
  message: { fontSize: 14, color: "#6b7280", marginBottom: 4 },
  time: { fontSize: 12, color: "#9ca3af" },
  thumbnail: { width: 50, height: 50, borderRadius: 8, marginLeft: 12 },
  deleteBtn: { padding: 8, justifyContent: "center", alignItems: "center" },
  emptyText: { marginTop: 16, fontSize: 16, color: "#9ca3af" },
});