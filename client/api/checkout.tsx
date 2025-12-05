import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`; // หรือจาก env
const API_CHECKOUT_BASE = `${API_BASE_URL}/api/v1/checkout`;

type CheckoutType = "CART" | "DIRECT";

interface CheckoutItem {
  variant_id: string;
  quantity: number;
}

interface CheckoutRequest {
  checkout_type: CheckoutType;
  cart_id?: string;
  items?: CheckoutItem[];
  shipping_address_id: string;
}

export async function checkoutApi(
  accessToken: string,
  payload: CheckoutRequest
) {
  const res = await fetch(API_CHECKOUT_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Checkout failed");
  }

  return json.data as {
    order_id: string;
    stripe_session_id: string;
    stripe_checkout_url: string;
  };
}
