// api/notification.tsx
import { DOMAIN } from "@/้host";
import axios from "axios";

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

// ================== API FUNCTIONS ==================

/**
 * ดึงการแจ้งเตือนทั้งหมด
 */
export async function fetchNotifications(
  token: string,
  limit: number = 50,
  offset: number = 0
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
      "❌ Error fetching notifications:",
      error.response?.data || error.message
    );
    return {
      notifications: [],
      total: 0,
      unread_count: 0,
    };
  }
}

/**
 * นับจำนวนการแจ้งเตือนที่ยังไม่อ่าน
 */
export async function fetchUnreadCount(
  token: string
): Promise<number> {
  try {
    const res = await axios.get(`${DOMAIN}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const responseData = res.data?.data || res.data;
    return responseData?.unread_count || 0;
  } catch (error: any) {
    console.error(
      "❌ Error fetching unread count:",
      error.response?.data || error.message
    );
    return 0;
  }
}

/**
 * ทำเครื่องหมายว่าอ่านแล้ว
 */
export async function markAsRead(
  token: string,
  notificationId: string
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/${notificationId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      message: res.data?.message || "Marked as read",
    };
  } catch (error: any) {
    console.error(
      "❌ Error marking as read:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว
 */
export async function markAllAsRead(
  token: string
): Promise<{ message: string }> {
  try {
    const res = await axios.post(
      `${DOMAIN}/notifications/read-all`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      message: res.data?.message || "Marked all as read",
    };
  } catch (error: any) {
    console.error(
      "❌ Error marking all as read:",
      error.response?.data || error.message
    );
    throw error;
  }
}

/**
 * ลบการแจ้งเตือน
 */
export async function deleteNotification(
  token: string,
  notificationId: string
): Promise<{ message: string }> {
  try {
    const res = await axios.delete(
      `${DOMAIN}/notifications/${notificationId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    return {
      message: res.data?.message || "Notification deleted",
    };
  } catch (error: any) {
    console.error(
      "❌ Error deleting notification:",
      error.response?.data || error.message
    );
    throw error;
  }
}