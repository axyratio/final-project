// hooks/useSellerNotifications.ts
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { useCallback, useEffect, useRef, useState } from "react";

export type SellerNotificationType =
  | "ORDER_RECEIVED"
  | "ORDER_COMPLETED"
  | "RETURN_REQUEST"
  | "LOW_STOCK";

export interface SellerNotificationData {
  type: "NOTIFICATION" | "CONNECTED" | "pong";
  notification_id?: string;
  notification_type?: SellerNotificationType;
  title?: string;
  message?: string;
  order_id?: string;
  return_id?: string;
  product_id?: string;
  is_read?: boolean;
  created_at?: string;
  store_id?: string;
}

interface UseSellerNotificationsOptions {
  onNotification?: (data: SellerNotificationData) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: Error) => void;
  autoReconnect?: boolean;
  reconnectInterval?: number;
}

export function useSellerNotifications(
  options: UseSellerNotificationsOptions = {},
) {
  const {
    onNotification,
    onConnected,
    onDisconnected,
    onError,
    autoReconnect = true,
    reconnectInterval = 5000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] =
    useState<SellerNotificationData | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | number | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | number | null>(null);
  const shouldReconnectRef = useRef(true);

  // ฟังก์ชันสำหรับเชื่อมต่อ WebSocket
  const connect = useCallback(async () => {
    try {
      // ดึง token จาก secure store
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token found");
      }

      // สร้าง WebSocket URL (แปลง http -> ws, https -> wss)
      const wsUrl = DOMAIN.replace("http://", "ws://").replace(
        "https://",
        "wss://",
      );
      const url = `${wsUrl}/ws/seller/notifications?token=${token}`;

      console.log("[Seller WS] Connecting to:", url);

      // สร้าง WebSocket connection
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Event: เมื่อเชื่อมต่อสำเร็จ
      ws.onopen = () => {
        console.log("[Seller WS] Connected");
        setIsConnected(true);
        onConnected?.();

        // เริ่ม ping-pong เพื่อเช็คว่า connection ยังมีชีวิตอยู่
        startPingPong();
      };

      // Event: เมื่อได้รับข้อความ
      ws.onmessage = (event) => {
        try {
          const data: SellerNotificationData = JSON.parse(event.data);
          console.log("[Seller WS] Received:", data);

          setLastNotification(data);

          // ถ้าเป็นการแจ้งเตือน ให้เรียก callback
          if (data.type === "NOTIFICATION") {
            onNotification?.(data);
          }
        } catch (error) {
          console.error("[Seller WS] Failed to parse message:", error);
        }
      };

      // Event: เมื่อเกิด error
      ws.onerror = (error) => {
        console.error("[Seller WS] Error:", error);
        onError?.(new Error("WebSocket error"));
      };

      // Event: เมื่อการเชื่อมต่อถูกปิด
      ws.onclose = (event) => {
        console.log("[Seller WS] Disconnected:", event.code, event.reason);
        setIsConnected(false);
        onDisconnected?.();
        stopPingPong();

        // Auto reconnect
        if (autoReconnect && shouldReconnectRef.current) {
          console.log(`[Seller WS] Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error("[Seller WS] Connection failed:", error);
      onError?.(error as Error);

      // Retry connection
      if (autoReconnect && shouldReconnectRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [
    autoReconnect,
    reconnectInterval,
    onConnected,
    onDisconnected,
    onError,
    onNotification,
  ]);

  // ฟังก์ชันสำหรับยกเลิกการเชื่อมต่อ
  const disconnect = useCallback(() => {
    shouldReconnectRef.current = false;
    stopPingPong();

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  // ฟังก์ชันส่ง ping
  const startPingPong = () => {
    stopPingPong();
    pingIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000); // ส่งทุก 30 วินาที
  };

  const stopPingPong = () => {
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  // ฟังก์ชันส่งข้อความ (ถ้าต้องการ)
  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn("[Seller WS] Cannot send, connection not open");
    }
  }, []);

  // เชื่อมต่อเมื่อ component mount
  useEffect(() => {
    shouldReconnectRef.current = true;
    connect();

    // Cleanup เมื่อ component unmount
    return () => {
      shouldReconnectRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastNotification,
    connect,
    disconnect,
    send,
  };
}
