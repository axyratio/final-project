// api/order.tsx
import { DOMAIN } from "@/้host";
import axios from "axios";

// Toggle สำหรับใช้ Mock Data หรือ API จริง
const USE_MOCK_DATA = false; // ✅ ใช้ API จริง

// ✅ เพิ่มสถานะใหม่
export type OrderStatus = 
  | "UNPAID"        // รอชำระเงิน
  | "PAID"          // ชำระเงินแล้ว
  | "PREPARING"     // กำลังเตรียมสินค้า
  | "SHIPPED"       // กำลังจัดส่ง
  | "DELIVERED"     // จัดส่งสำเร็จ
  | "COMPLETED"     // ลูกค้ายืนยันรับแล้ว
  | "RETURNING"     // กำลังคืนสินค้า
  | "RETURNED"      // คืนสินค้าแล้ว
  | "REJECTED"
  | "APPROVED"   // ยกเลิก
  | "CANCELLED"  
  | "FAILED";       // ล้มเหลว
  

// ✅ เพิ่ม Return Types
export type ReturnReason =
  | "WRONG_ITEM"
  | "DAMAGED"
  | "NOT_AS_DESCRIBED"
  | "DEFECTIVE"
  | "SIZE_ISSUE"
  | "QUALITY_ISSUE"
  | "OTHER";

export type ReturnStatus = "PENDING" | "APPROVED" | "REJECTED" | "REFUNDED" | "CANCELLED";

export type ReturnOrder = {
  return_id: string;
  order_id: string;
  reason: ReturnReason;
  reason_detail?: string;
  image_urls: string[];
  status: ReturnStatus;
  status_text: string;
  refund_amount?: number;
  store_note?: string;
  created_at: string;
};

// ✅ Type สำหรับ Upload Response
export type UploadImageResponse = {
  image_id: string;
  url: string;
};

export type OrderItem = {
  order_item_id: string;
  product_id: string;
  variant_id: string;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  image_url?: string;
};

export type Order = {
  order_id: string;
  store_id: string;
  store_name: string;
  order_status: OrderStatus;
  order_text_status: string;
  customer_name: string;
  shipping_cost: number;
  tracking_number?: string;
  courier_name?: string;
  total_price: number;
  created_at: string;
  updated_at?: string;
  paid_at?: string;
  delivered_at?: string;
  completed_at?: string;
  order_items: OrderItem[];
  can_confirm_received: boolean;  // แสดงปุ่ม "ได้รับสินค้าแล้ว"
  can_return: boolean;            // แสดงปุ่ม "คืนสินค้า"
  can_review: boolean;
};

export type OrderListResponse = {
  orders: Order[];
  total: number;
};

// ================== MOCK DATA ==================
const MOCK_ORDERS: Order[] = [
  {
    order_id: "order-001",
    store_id: "store-001",
    store_name: "Axio Store",
    order_status: "PREPARING",
    order_text_status: "กำลังเตรียมสินค้า",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 30,
    total_price: 835,
    created_at: "2025-01-01T10:00:00Z",
    updated_at: "2025-01-01T10:05:00Z",
    paid_at: "2025-01-01T10:05:00Z",
    can_confirm_received: false,
    can_return: false,
    can_review: false,
    order_items: [
      {
        order_item_id: "item-001",
        product_id: "prod-001",
        variant_id: "var-001",
        product_name: "เสื้อยืด",
        variant_name: "ไซส์ L",
        quantity: 3,
        unit_price: 105,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
  {
    order_id: "order-002",
    store_id: "store-002",
    store_name: "Fashion Hub",
    order_status: "SHIPPED",
    order_text_status: "กำลังจัดส่ง",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 50,
    tracking_number: "TH987654321",
    courier_name: "Flash Express",
    total_price: 1250,
    created_at: "2024-12-20T15:00:00Z",
    updated_at: "2024-12-22T09:00:00Z",
    paid_at: "2024-12-20T15:05:00Z",
    can_confirm_received: false,
    can_return: false,
    can_review: false,
    order_items: [
      {
        order_item_id: "item-003",
        product_id: "prod-003",
        variant_id: "var-003",
        product_name: "เสื้อโปโล",
        variant_name: "ไซส์ XL",
        quantity: 1,
        unit_price: 600,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
  {
    order_id: "order-003",
    store_id: "store-003",
    store_name: "Style Shop",
    order_status: "DELIVERED",
    order_text_status: "จัดส่งสำเร็จ",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 40,
    tracking_number: "TH123456789",
    courier_name: "Kerry Express",
    total_price: 450,
    created_at: "2025-01-01T08:00:00Z",
    delivered_at: "2025-01-03T14:30:00Z",
    can_confirm_received: true,   // ✅ แสดงปุ่มได้รับสินค้า
    can_return: true,             // ✅ แสดงปุ่มคืนสินค้า
    can_review: false,
    order_items: [
      {
        order_item_id: "item-005",
        product_id: "prod-005",
        variant_id: "var-005",
        product_name: "เสื้อยืดคอกลม",
        variant_name: "ไซส์ M",
        quantity: 1,
        unit_price: 410,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
  {
    order_id: "order-004",
    store_id: "store-004",
    store_name: "Cool Store",
    order_status: "COMPLETED",
    order_text_status: "ได้รับสินค้าแล้ว",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 40,
    total_price: 850,
    created_at: "2024-12-15T08:00:00Z",
    delivered_at: "2024-12-20T14:30:00Z",
    completed_at: "2024-12-22T10:00:00Z",
    can_confirm_received: false,
    can_return: false,
    can_review: true,
    order_items: [
      {
        order_item_id: "item-006",
        product_id: "prod-006",
        variant_id: "var-006",
        product_name: "กางเกงยีนส์",
        variant_name: "ไซส์ L",
        quantity: 1,
        unit_price: 810,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
  {
    order_id: "order-005",
    store_id: "store-005",
    store_name: "Return Store",
    order_status: "RETURNING",
    order_text_status: "กำลังคืนสินค้า",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 30,
    total_price: 500,
    created_at: "2025-01-02T08:00:00Z",
    can_confirm_received: false,
    can_return: false,
    can_review: false,
    order_items: [
      {
        order_item_id: "item-007",
        product_id: "prod-007",
        variant_id: "var-007",
        product_name: "เสื้อกันหนาว",
        variant_name: "ไซส์ M",
        quantity: 1,
        unit_price: 470,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
  {
    order_id: "order-006",
    store_id: "store-006",
    store_name: "Cancel Store",
    order_status: "CANCELLED",
    order_text_status: "ยกเลิกแล้ว",
    customer_name: "คุณผู้ใช้",
    shipping_cost: 30,
    total_price: 300,
    created_at: "2025-01-03T08:00:00Z",
    can_confirm_received: false,
    can_return: false,
    can_review: false,
    order_items: [
      {
        order_item_id: "item-008",
        product_id: "prod-008",
        variant_id: "var-008",
        product_name: "กระเป๋า",
        variant_name: "สีดำ",
        quantity: 1,
        unit_price: 270,
        image_url: "https://via.placeholder.com/150",
      },
    ],
  },
];

// Helper function สำหรับ delay
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ================== API FUNCTIONS ==================

/**
 * ดึงรายการคำสั่งซื้อทั้งหมดของผู้ใช้
 */
export async function fetchUserOrders(
  token: string,
  status?: OrderStatus
): Promise<OrderListResponse> {
  if (USE_MOCK_DATA) {
    await delay(500);
    let filteredOrders = MOCK_ORDERS;
    if (status) {
      filteredOrders = MOCK_ORDERS.filter((order) => order.order_status === status);
    }
    return {
      orders: filteredOrders,
      total: filteredOrders.length,
    };
  }

  try {
    const params = status ? { status } : {};
    const res = await axios.get(`${DOMAIN}/orders/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    
    console.log("✅ API Response:", res.data);
    
    const responseData = res.data?.data || res.data;

    console.log("[Order]", JSON.stringify(responseData));
    return {
      orders: Array.isArray(responseData?.orders) ? responseData.orders : [],
      total: responseData?.total || 0,
    };
  } catch (error: any) {
    console.error("❌ Error fetching orders:", error.response?.data || error.message);
    return {
      orders: [],
      total: 0,
    };
  }
}

/**
 * ดึงรายละเอียดคำสั่งซื้อ
 */
export async function fetchOrderDetail(
  token: string,
  orderId: string
): Promise<Order | null> {
  if (USE_MOCK_DATA) {
    await delay(300);
    const order = MOCK_ORDERS.find((o) => o.order_id === orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    return order;
  }

  try {
    const res = await axios.get(`${DOMAIN}/orders/${orderId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const responseData = res.data?.data || res.data;
    return responseData;
  } catch (error: any) {
    console.error("❌ Error fetching order detail:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ✅ ยืนยันว่าได้รับสินค้าแล้ว - เปลี่ยนสถานะเป็น COMPLETED
 */
export async function confirmOrderReceived(
  token: string,
  orderId: string
): Promise<{ message: string; order: Order }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const orderIndex = MOCK_ORDERS.findIndex((o) => o.order_id === orderId);
    if (orderIndex === -1) {
      throw new Error("Order not found");
    }
    
    MOCK_ORDERS[orderIndex] = {
      ...MOCK_ORDERS[orderIndex],
      order_status: "COMPLETED",
      order_text_status: "ได้รับสินค้าแล้ว",
      can_confirm_received: false,
      can_return: false,
      can_review: true,
      completed_at: new Date().toISOString(),
    };
    
    return {
      message: "ยืนยันการรับสินค้าสำเร็จ",
      order: MOCK_ORDERS[orderIndex],
    };
  }

  try {
    const res = await axios.post(
      `${DOMAIN}/orders/${orderId}/confirm-received`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const responseData = res.data?.data || res.data;
    
    return {
      message: res.data?.message || "ยืนยันการรับสินค้าสำเร็จ",
      order: responseData,
    };
  } catch (error: any) {
    console.error("❌ Error confirming order:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ซื้ออีกครั้ง - เพิ่มสินค้าจาก order เข้าตะกร้า
 */
export async function reorderItems(
  token: string,
  orderId: string
): Promise<{ message: string; cart_items_added: number }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    const order = MOCK_ORDERS.find((o) => o.order_id === orderId);
    if (!order) {
      throw new Error("Order not found");
    }
    
    return {
      message: "เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
      cart_items_added: order.order_items.length,
    };
  }

  try {
    const res = await axios.post(
      `${DOMAIN}/orders/${orderId}/reorder`,
      {},
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const responseData = res.data?.data || res.data;
    
    return {
      message: res.data?.message || "เพิ่มสินค้าเข้าตะกร้าสำเร็จ",
      cart_items_added: responseData?.cart_items_added || 0,
    };
  } catch (error: any) {
    console.error("❌ Error reordering:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ส่งรีวิวสินค้า
 */
export async function submitProductReview(
  token: string,
  productId: string,
  data: { rating: number; comment: string }
): Promise<{ message: string }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return { message: "ส่งรีวิวสำเร็จ" };
  }

  try {
    const res = await axios.post(
      `${DOMAIN}/products/${productId}/review`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return {
      message: res.data?.message || "ส่งรีวิวสำเร็จ",
    };
  } catch (error: any) {
    console.error("❌ Error submitting review:", error.response?.data || error.message);
    throw error;
  }
}

// ==================== RETURN ORDER APIs ====================

/**
 * ✅ อัปโหลดรูปภาพหลักฐานการคืนสินค้าทีละรูป
 */
export async function uploadReturnImage(
  token: string,
  imageUri: string
): Promise<UploadImageResponse> {
  if (USE_MOCK_DATA) {
    await delay(1000);
    return {
      image_id: `img_${Date.now()}`,
      url: imageUri,
    };
  }

  try {
    // สร้าง FormData สำหรับส่งรูปภาพ
    const formData = new FormData();
    
    // แปลง URI เป็น File object
    const filename = imageUri.split('/').pop() || 'image.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    
    formData.append('file', {
      uri: imageUri,
      name: filename,
      type: type,
    } as any);

    const res = await axios.post(
      `${DOMAIN}/orders/return/upload-image`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    
    const responseData = res.data?.data || res.data;
    
    return {
      image_id: responseData?.image_id || "",
      url: responseData?.url || "",
    };
  } catch (error: any) {
    console.error("❌ Error uploading return image:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ✅ ลบรูปภาพที่อัปโหลดชั่วคราว
 */
export async function deleteReturnImage(
  token: string,
  imageId: string
): Promise<{ message: string }> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return { message: "ลบรูปภาพสำเร็จ" };
  }

  try {
    const res = await axios.delete(
      `${DOMAIN}/orders/return/images/${imageId}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    return {
      message: res.data?.message || "ลบรูปภาพสำเร็จ",
    };
  } catch (error: any) {
    console.error("❌ Error deleting return image:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ✅ สร้างคำขอคืนสินค้า (ใช้ image_ids แทน image_urls)
 */
export async function createReturnRequest(
  token: string,
  data: {
    order_id: string;
    reason: ReturnReason;
    reason_detail?: string;
    image_ids: string[];  // ✅ เปลี่ยนจาก image_urls
  }
): Promise<{ message: string; return_id: string }> {
  if (USE_MOCK_DATA) {
    await delay(500);
    return {
      message: "สร้างคำขอคืนสินค้าสำเร็จ",
      return_id: "return-" + Date.now(),
    };
  }

  try {
    const res = await axios.post(
      `${DOMAIN}/orders/return`,
      data,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    
    const responseData = res.data?.data || res.data;
    
    return {
      message: res.data?.message || "สร้างคำขอคืนสินค้าสำเร็จ",
      return_id: responseData?.return_id || "",
    };
  } catch (error: any) {
    console.error("❌ Error creating return request:", error.response?.data || error.message);
    throw error;
  }
}

/**
 * ✅ ดึงรายการคำขอคืนสินค้า
 */
export async function fetchReturnRequests(
  token: string,
  orderId?: string
): Promise<{ returns: ReturnOrder[] }> {
  if (USE_MOCK_DATA) {
    await delay(300);
    return { returns: [] };
  }

  try {
    const params = orderId ? { order_id: orderId } : {};
    const res = await axios.get(`${DOMAIN}/orders/returns/me`, {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });
    
    const responseData = res.data?.data || res.data;
    
    return {
      returns: Array.isArray(responseData?.returns) ? responseData.returns : [],
    };
  } catch (error: any) {
    console.error("❌ Error fetching return requests:", error.response?.data || error.message);
    return { returns: [] };
  }
}