// client/api/notification.tsx
import { DOMAIN } from "@/้host";
import axios from "axios";

// ── WS_DOMAIN: เปลี่ยน http → ws (หรือ https → wss) อัตโนมัติ ──
const WS_DOMAIN = DOMAIN.replace(/^http:/, "ws:").replace(/^https:/, "wss:");

// ================== TYPES ==================

export type NotificationType =
  | "ORDER_PAID"
  | "ORDER_PREPARING"
  | "ORDER_SHIPPED"
  | "ORDER_DELIVERED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "RETURN_REQUEST"
  | "RETURN_APPROVED"
  | "RETURN_REJECTED"
  | "NEW_MESSAGE"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED";

export type Notification = {
  notification_id: string;
  notification_type: NotificationType;
  title: string;
  message: string;
  order_id?: string;
  store_id?: string;
  conversation_id?: string;
  image_url?: string;
  is_read: boolean;
  created_at: string;
  read_at?: string;
};

export type NotificationListResponse = {
  notifications: Notification[];
  total: number;
  unread_count: number;
};

export type UnreadCountResponse = {
  unread_count: number;
};

export type WSNotificationEvent = {
  type: "notification";
  notification: Notification;
  unread_count: number;
};

// ================== REST API FUNCTIONS ==================

export async function fetchNotifications(
  token: string,
  limit: number = 50,
  offset: number = 0,
): Promise<NotificationListResponse> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit, offset },
    });
    const responseData = res.data?.data || res.data;
    return {
      notifications: Array.isArray(responseData?.notifications)
        ? responseData.notifications
        : [],
      total: responseData?.total || 0,
      unread_count: responseData?.unread_count || 0,
    };
  } catch (error: any) {
    console.error(
      "❌ fetchNotifications:",
      error.response?.data || error.message,
    );
    return { notifications: [], total: 0, unread_count: 0 };
  }
}

export async function fetchUnreadCount(token: string): Promise<number> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const responseData = res.data?.data || res.data;
    return responseData?.unread_count || 0;
  } catch (error: any) {
    console.error(
      "❌ fetchUnreadCount:",
      error.response?.data || error.message,
    );
    return 0;
  }
}

export async function markAsRead(
  token: string,
  notificationId: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { message: res.data?.message || "Marked as read" };
  } catch (error: any) {
    console.error("❌ markAsRead:", error.response?.data || error.message);
    throw error;
  }
}

export async function markAllAsRead(
  token: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/read-all`,
      {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { message: res.data?.message || "Marked all as read" };
  } catch (error: any) {
    console.error("❌ markAllAsRead:", error.response?.data || error.message);
    throw error;
  }
}

export async function deleteNotification(
  token: string,
  notificationId: string,
): Promise<{ message: string }> {
  try {
    const res = await axios.delete(
      `${DOMAIN}/notifications/${notificationId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return { message: res.data?.message || "Notification deleted" };
  } catch (error: any) {
    console.error(
      "❌ deleteNotification:",
      error.response?.data || error.message,
    );
    throw error;
  }
}

// ================== WEBSOCKET ==================

export function connectNotificationWS(
  token: string,
  onNotification: (event: WSNotificationEvent) => void,
): () => void {
  const url = `${WS_DOMAIN}/ws/user/notifications?token=${token}`;

  console.log("\n" + "=".repeat(80));
  console.log("[NotificationWS] 🎯 connectNotificationWS CALLED");
  console.log("[NotificationWS] URL:", url);
  console.log("[NotificationWS] Token length:", token.length);
  console.log("=".repeat(80) + "\n");

  const ws = new WebSocket(url);

  // ping ทุก 25s เพื่อ keep-alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      const pingMsg = { type: "ping", timestamp: Date.now() };
      console.log("[NotificationWS] 📤 Sending ping:", pingMsg);
      ws.send(JSON.stringify(pingMsg));
    } else {
      console.log(
        "[NotificationWS] ⚠️ Cannot ping, WebSocket state:",
        ws.readyState,
      );
    }
  }, 25_000);

  ws.onopen = () => {
    console.log("\n" + "=".repeat(80));
    console.log("[NotificationWS] ✅ WebSocket CONNECTED");
    console.log("[NotificationWS] readyState:", ws.readyState);
    console.log("=".repeat(80) + "\n");
  };

  ws.onmessage = (event) => {
    console.log("\n" + "=".repeat(80));
    console.log("[NotificationWS] 📨 Message RECEIVED");
    console.log("[NotificationWS] Raw data:", event.data);

    try {
      const data = JSON.parse(event.data);
      console.log("[NotificationWS] Parsed data:", data);
      console.log("[NotificationWS] Message type:", data.type);

      // รับ notification ใหม่จาก server → call callback
      if (data.type === "notification") {
        console.log("[NotificationWS] 🔔 NOTIFICATION EVENT RECEIVED");
        console.log(
          "[NotificationWS] Notification ID:",
          data.notification?.notification_id,
        );
        console.log(
          "[NotificationWS] Notification type:",
          data.notification?.notification_type,
        );
        console.log("[NotificationWS] Title:", data.notification?.title);
        console.log("[NotificationWS] Message:", data.notification?.message);
        console.log("[NotificationWS] Unread count:", data.unread_count);
        console.log("[NotificationWS] 🚀 Calling onNotification callback...");

        onNotification(data as WSNotificationEvent);

        console.log("[NotificationWS] ✅ Callback executed");
      } else if (data.type === "CONNECTED") {
        console.log("[NotificationWS] ✅ CONNECTED event:", data.message);
        console.log("[NotificationWS] User ID:", data.user_id);
      } else if (data.type === "pong") {
        console.log("[NotificationWS] 🏓 Pong received");
      } else {
        console.log("[NotificationWS] ℹ️ Other message type:", data.type);
      }

      console.log("=".repeat(80) + "\n");
    } catch (err) {
      console.error("[NotificationWS] ❌ Parse error:", err);
      console.error("[NotificationWS] Raw data:", event.data);
      console.log("=".repeat(80) + "\n");
    }
  };

  ws.onerror = (err) => {
    console.error("\n" + "=".repeat(80));
    console.error("[NotificationWS] ❌ WebSocket ERROR");
    console.error("[NotificationWS] Error:", err);
    console.error("=".repeat(80) + "\n");
  };

  ws.onclose = (e) => {
    console.log("\n" + "=".repeat(80));
    console.log("[NotificationWS] ❌ WebSocket CLOSED");
    console.log("[NotificationWS] Code:", e.code);
    console.log("[NotificationWS] Reason:", e.reason);
    console.log("[NotificationWS] Clean:", e.wasClean);
    console.log("=".repeat(80) + "\n");
  };

  // return cleanup function
  return () => {
    console.log("\n" + "=".repeat(80));
    console.log("[NotificationWS] 🧹 CLEANUP called");
    clearInterval(pingInterval);
    if (
      ws.readyState === WebSocket.OPEN ||
      ws.readyState === WebSocket.CONNECTING
    ) {
      console.log("[NotificationWS] Closing WebSocket...");
      ws.close();
      console.log("[NotificationWS] ✅ WebSocket closed");
    } else {
      console.log(
        "[NotificationWS] WebSocket already closed, state:",
        ws.readyState,
      );
    }
    console.log("=".repeat(80) + "\n");
  };
}
