// api/seller.tsx
import type { ShippingAddress } from "@/api/address";
import { DOMAIN } from "@/้host";
import axios from "axios";

// Toggle สำหรับใช้ Mock Data หรือ API จริง
const USE_MOCK_DATA = false; // ✅ เปลี่ยนเป็น false เพื่อใช้ API จริง

// ================== TYPES ==================

export type SalesStats = {
  today: number;
  week: number;
  month: number;
  change_today: number;
  change_week: number;
  change_month: number;
};

export type TopProduct = {
  product_id: string;
  product_name: string;
  image_url: string;
  sold_count: number;
  revenue: number;
  category: string;
};

export type SalesChartData = {
  date: string;
  sales: number;
};

export type OrderStatusCount = {
  preparing: number;
  shipped: number;
  delivered: number;
  completed: number;
};

export type DashboardData = {
  sales_stats: SalesStats;
  top_products: TopProduct[];
  sales_chart: SalesChartData[];
  order_status_count: OrderStatusCount;
  total_customers: number;
  pending_returns: number;
};

export type SellerOrder = {
  order_id: string;
  customer_name: string;
  customer_phone?: string;
  order_status: string;
  order_text_status: string;
  total_price: number;
  shipping_cost: number;
  tracking_number?: string;
  courier_name?: string;
  created_at: string;
  paid_at?: string;
  delivered_at?: string;
  completed_at?: string;
  order_items: Array<{
    order_item_id: string;
    product_id: string;
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: number;
    image_url?: string;
  }>;
  shipping_address?: ShippingAddress;
};

export type ReturnRequest = {
  return_id: string;
  order_id: string;
  customer_name: string;
  reason: string;
  reason_detail?: string;
  image_urls: string[];
  status: string;
  status_text: string;
  refund_amount: number;
  created_at: string;
  order_items: Array<{
    product_name: string;
    variant_name: string;
    quantity: number;
    unit_price: number;
  }>;
};

export type SellerNotification = {
  notification_id: string;
  type: "ORDER_RECEIVED" | "ORDER_COMPLETED" | "RETURN_REQUEST" | "LOW_STOCK";
  title: string;
  message: string;
  order_id?: string;
  is_read: boolean;
  created_at: string;
};

// ================== MOCK DATA (สำหรับทดสอบ) ==================

const MOCK_DASHBOARD: DashboardData = {
  sales_stats: {
    today: 82847,
    week: 518329,
    month: 1876845,
    change_today: 12.5,
    change_week: 8.2,
    change_month: -2.1,
  },
  top_products: [
    {
      product_id: "prod-001",
      product_name: "Lorem Shirt Premium Quality",
      image_url: "https://via.placeholder.com/100",
      sold_count: 124,
      revenue: 83700,
      category: "เสื้อผ้า",
    },
    {
      product_id: "prod-002",
      product_name: "Lorem Jeans Denim",
      image_url: "https://via.placeholder.com/100",
      sold_count: 98,
      revenue: 67200,
      category: "กางเกง",
    },
    {
      product_id: "prod-003",
      product_name: "Lorem Bag Leather",
      image_url: "https://via.placeholder.com/100",
      sold_count: 76,
      revenue: 45600,
      category: "กระเป๋า",
    },
  ],
  sales_chart: [
    { date: "จ", sales: 2100 },
    { date: "อ", sales: 2600 },
    { date: "พ", sales: 2400 },
    { date: "พฤ", sales: 2900 },
    { date: "ศ", sales: 2700 },
    { date: "ส", sales: 3100 },
    { date: "อา", sales: 2950 },
  ],
  order_status_count: {
    preparing: 15,
    shipped: 8,
    delivered: 23,
    completed: 156,
  },
  total_customers: 342,
  pending_returns: 3,
};

const MOCK_SELLER_ORDERS: SellerOrder[] = [
  {
    order_id: "order-001",
    customer_name: "คุณสมชาย ใจดี",
    customer_phone: "0812345678",
    order_status: "PREPARING",
    order_text_status: "กำลังเตรียมสินค้า",
    total_price: 1250,
    shipping_cost: 50,
    created_at: "2025-01-05T10:30:00Z",
    paid_at: "2025-01-05T10:32:00Z",
    order_items: [
      {
        order_item_id: "item-001",
        product_id: "prod-001",
        product_name: "เสื้อยืดคอกลม",
        variant_name: "ไซส์ L / สีขาว",
        quantity: 2,
        unit_price: 600,
        image_url: "https://via.placeholder.com/80",
      },
    ],
    shipping_address: {
      ship_addr_id: "addr-001",
      user_id: "user-001",
      full_name: "คุณสมชาย ใจดี",
      phone_number: "0812345678",
      address_line: "123 หมู่ 5",
      sub_district: "ในเมือง",
      district: "เมือง",
      province: "อุบลราชธานี",
      postal_code: "34000",
      is_default: true,
    },
  },
];

const MOCK_RETURN_REQUESTS: ReturnRequest[] = [
  {
    return_id: "return-001",
    order_id: "order-003",
    customer_name: "คุณทดสอบ คืนสินค้า",
    reason: "WRONG_ITEM",
    reason_detail: "ได้รับสินค้าไม่ตรงกับที่สั่ง สีไม่ตรง",
    image_urls: [
      "https://via.placeholder.com/200",
      "https://via.placeholder.com/200",
    ],
    status: "PENDING",
    status_text: "รอการตรวจสอบ",
    refund_amount: 1200,
    created_at: "2025-01-04T15:30:00Z",
    order_items: [
      {
        product_name: "เสื้อโปโล",
        variant_name: "ไซส์ XL / สีแดง",
        quantity: 1,
        unit_price: 1200,
      },
    ],
  },
];

const MOCK_NOTIFICATIONS: SellerNotification[] = [
  {
    notification_id: "notif-001",
    type: "ORDER_RECEIVED",
    title: "มีออเดอร์ใหม่",
    message: "คุณมีออเดอร์ใหม่จากคุณสมชาย ใจดี",
    order_id: "order-001",
    is_read: false,
    created_at: "2025-01-05T10:30:00Z",
  },
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ================== API FUNCTIONS ==================

/**
 * ดึงข้อมูล Dashboard
 */
export async function fetchSellerDashboard(
  token: string,
  month?: string
): Promise<DashboardData> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return MOCK_DASHBOARD;
  }

  try {
    const params = month ? { month } : {};
    const res = await axios.get(`${DOMAIN}/seller/dashboard`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    const data = res.data?.data || res.data;
    return data;
  } catch (error: any) {
    console.error("❌ Error fetching dashboard:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ดึงรายการออเดอร์ของร้าน
 */
export async function fetchSellerOrders(
  token: string,
  status?: string
): Promise<SellerOrder[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    if (status) {
      return MOCK_SELLER_ORDERS.filter((o) => o.order_status === status);
    }
    return MOCK_SELLER_ORDERS;
  }

  try {
    const params = status ? { status } : {};
    const res = await axios.get(`${DOMAIN}/seller/orders`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    const data = res.data?.data || res.data;
    return data?.orders || [];
  } catch (error: any) {
    console.error("❌ Error fetching orders:", error.response?.data || error.message);
    return [];
  }
}

/**
 * ยืนยันออเดอร์และเพิ่ม tracking number
 */
export async function confirmOrderShipped(
  token: string,
  orderId: string,
  trackingNumber: string,
  courierName: string
): Promise<{ message: string }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const order = MOCK_SELLER_ORDERS.find((o) => o.order_id === orderId);
    if (order) {
      order.order_status = "SHIPPED";
      order.order_text_status = "กำลังจัดส่ง";
      order.tracking_number = trackingNumber;
      order.courier_name = courierName;
    }
    return { message: "ยืนยันการจัดส่งสำเร็จ" };
  }

  try {
    const res = await axios.post(
      `${DOMAIN}/seller/orders/${orderId}/ship`,
      {
        tracking_number: trackingNumber,
        courier_name: courierName,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error confirming shipment:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ดึงรายการคำขอคืนสินค้า
 */
export async function fetchReturnRequests(
  token: string,
  status?: string
): Promise<ReturnRequest[]> {
  if (USE_MOCK_DATA) {
    await delay(500);
    if (status) {
      return MOCK_RETURN_REQUESTS.filter((r) => r.status === status);
    }
    return MOCK_RETURN_REQUESTS;
  }

  try {
    const params = status ? { status } : {};
    const res = await axios.get(`${DOMAIN}/seller/returns`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    const data = res.data?.data || res.data;
    return data?.returns || [];
  } catch (error: any) {
    console.error("❌ Error fetching returns:", error.response?.data || error.message);
    return [];
  }
}

/**
 * อนุมัติหรือปฏิเสธการคืนสินค้า
 */
export async function handleReturnRequest(
  token: string,
  returnId: string,
  action: "APPROVE" | "REJECT",
  note?: string
): Promise<{ message: string }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const returnReq = MOCK_RETURN_REQUESTS.find((r) => r.return_id === returnId);
    if (returnReq) {
      returnReq.status = action === "APPROVE" ? "APPROVED" : "REJECTED";
      returnReq.status_text = action === "APPROVE" ? "อนุมัติ" : "ปฏิเสธ";
    }
    return {
      message: action === "APPROVE" ? "อนุมัติการคืนสินค้าสำเร็จ" : "ปฏิเสธการคืนสินค้าสำเร็จ",
    };
  }

  try {
    const endpoint = action === "APPROVE" ? "approve" : "reject";
    const res = await axios.post(
      `${DOMAIN}/seller/returns/${returnId}/${endpoint}`,
      action === "REJECT" ? { note } : {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return res.data;
  } catch (error: any) {
    console.error("❌ Error handling return:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ดึงการแจ้งเตือน
 */
export async function fetchSellerNotifications(
  token: string
): Promise<SellerNotification[]> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return MOCK_NOTIFICATIONS;
  }

  try {
    const res = await axios.get(`${DOMAIN}/seller/notifications`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = res.data?.data || res.data;
    return data?.notifications || [];
  } catch (error: any) {
    console.error("❌ Error fetching notifications:", error.response?.data || error.message);
    return [];
  }
}

/**
 * อ่านการแจ้งเตือน
 */
export async function markNotificationAsRead(
  token: string,
  notificationId: string
): Promise<void> {
  if (USE_MOCK_DATA) {
    await delay(200);
    const notif = MOCK_NOTIFICATIONS.find((n) => n.notification_id === notificationId);
    if (notif) {
      notif.is_read = true;
    }
    return;
  }

  try {
    await axios.post(
      `${DOMAIN}/seller/notifications/${notificationId}/read`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  } catch (error: any) {
    console.error("❌ Error marking notification:", error.response?.data || error.message);
  }
}