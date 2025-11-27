// api/cart.tsx
import { DOMAIN } from "@/้host";
import { getToken } from "@/utils/secure-store";

const API_BASE_URL = `${DOMAIN}`;
const CART_API_BASE = `${API_BASE_URL}/cart`;

export type AddToCartPayload = {
  productId: string;
  variantId: string;   // ❗ ต้องส่ง variantId เสมอ เพราะ DB บังคับ not null
  quantity: number;
};

export type CartSummary = {
  itemCount: number;
};

export async function addToCart(payload: AddToCartPayload): Promise<void> {
  const token = await getToken();

  const res = await fetch(`${CART_API_BASE}/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: JSON.stringify({
      product_id: payload.productId,
      variant_id: payload.variantId,
      quantity: payload.quantity,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("addToCart error:", res.status, text);
    throw new Error("เพิ่มสินค้าลงตะกร้าไม่สำเร็จ");
  }
}

export async function getCartSummary(): Promise<CartSummary> {
  const token = await getToken();

  const res = await fetch(`${CART_API_BASE}/summary`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!res.ok) {
    console.log("getCartSummary error:", res.status);
    return { itemCount: 0 };
  }

  const json = await res.json();
  const itemCount = json?.data?.item_count ?? 0;
  return { itemCount };
}
