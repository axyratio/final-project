// components/checkout/CheckoutScreen.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Box,
  Button,
  Divider,
  HStack,
  Radio,
  ScrollView,
  Text,
  VStack,
} from "native-base";
import React, { useEffect, useMemo, useRef, useState } from "react"; // ✅ เพิ่ม useRef
import { Modal as RNModal } from "react-native";
import { WebView } from "react-native-webview";

import { CartItem } from "@/api/cart";
import { checkoutCart } from "@/api/checkout";
import { useAddressStore } from "@/components/address/address-store";
import { SelectedAddressCard } from "@/components/address/select-address-card";
import { CartStoreSection } from "@/components/cart/card-store-section";
import { useCartStore } from "@/components/cart/cart-memo";
import { AppBarNoCheck } from "@/components/navbar";

// ✅ เพิ่ม (สำหรับ cancel reservation)
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

type StoreGroup = {
  storeId: string;
  storeName: string;
  items: CartItem[];
  storeTotal: number;
};

const SHIPPING_PER_STORE = 38;

// ✅ เพิ่ม helper แปลงเวลา
const formatMMSS = (ms: number) => {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

// ✅ เพิ่ม helper cancel reservation (best-effort)
async function cancelReservationOrders(orderIds: string[]) {
  if (!orderIds.length) return;

  try {
    const token = await getToken();
    await Promise.all(
      orderIds.map(async (orderId) => {
        const res = await fetch(`${DOMAIN}/api/v1/checkout/cancel/${orderId}`, {
          method: "POST",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const text = await res.text();
          console.log("cancelReservationOrders error:", res.status, text);
        }
      }),
    );
  } catch (e) {
    console.log("cancelReservationOrders exception:", e);
  }
}

export const CheckoutScreen: React.FC = () => {
  const router = useRouter();

  const {
    cartId: cartIdParam,
    productId,
    variantId,
    quantity,
    storeId,
    storeName,
    unitPrice,
    productName,
    variantName,
    image_url,
  } = useLocalSearchParams<{
    cartId?: string;
    productId?: string;
    variantId?: string;
    quantity?: string;
    storeId?: string;
    storeName?: string;
    unitPrice?: string;
    productName?: string;
    variantName?: string;
    image_url?: string;
  }>();

  const isDirect = !!(productId && variantId); // มี product + variant = โหมด DIRECT

  const qty = useMemo(() => {
    const q = Number(quantity);
    return Number.isFinite(q) && q > 0 ? q : 1;
  }, [quantity]);

  const { addresses, selected, loading, fetchAll } = useAddressStore();
  const { cartId, cartItems, selectedIds, getSelectedTotal } = useCartStore();

  const [paymentMethod, setPaymentMethod] =
    useState<"STRIPE_CARD">("STRIPE_CARD");
  const [loadingPay, setLoadingPay] = useState(false);
  const [stripeUrl, setStripeUrl] = useState<string | null>(null);

  // ✅ เพิ่ม state/refs สำหรับ timer + cancel
  const [expiresAtMs, setExpiresAtMs] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState<number>(0);

  const orderIdsRef = useRef<string[]>([]);
  const shouldCancelRef = useRef<boolean>(false); // ถ้า user ออกเอง → cancel
  const timeoutFiredRef = useRef<boolean>(false); // กันยิง timeout ซ้ำ

  useEffect(() => {
    fetchAll();
  }, []);

  // ✅ เพิ่ม effect timer: เปิดเมื่อมี stripeUrl และ expiresAtMs
  useEffect(() => {
    if (!stripeUrl || !expiresAtMs) return;

    timeoutFiredRef.current = false;

    const tick = () => {
      const ms = expiresAtMs - Date.now();
      setRemainingMs(ms);

      if (ms <= 0 && !timeoutFiredRef.current) {
        timeoutFiredRef.current = true;

        // หมดเวลา → cancel reservation แล้วไปหน้า timeout
        (async () => {
          try {
            shouldCancelRef.current = false; // timeout ไม่ถือว่า "user ออกเอง" แต่เราจะ cancel อยู่ดี
            await cancelReservationOrders(orderIdsRef.current);
            await useCartStore.getState().backgroundSync();
          } catch (e) {
            console.log("timeout cancel error:", e);
          } finally {
            setStripeUrl(null);
            setExpiresAtMs(null);
            setRemainingMs(0);
            router.replace("/payment-timeout" as any);
          }
        })();
      }
    };

    tick();
    const id = setInterval(tick, 500);

    return () => clearInterval(id);
  }, [stripeUrl, expiresAtMs]);

  // ─────────────────────────────
  // 1) สินค้าที่เลือกจาก CART
  // ─────────────────────────────
  const selectedItems = useMemo(
    () => cartItems.filter((i) => selectedIds.has(i.cart_item_id)),
    [cartItems, selectedIds],
  );

  // ─────────────────────────────
  // 2) directStoreGroup: ใช้ params สร้าง CartItem เดียว
  // ─────────────────────────────
  const directStoreGroup: StoreGroup | null = useMemo(() => {
    if (
      !isDirect ||
      !storeId ||
      !storeName ||
      !unitPrice ||
      !productId ||
      !variantId
    ) {
      return null;
    }

    const price = Number(unitPrice);
    if (!Number.isFinite(price)) return null;

    // ประกอบ object ให้หน้าตาเป็น CartItem
    const directItem: CartItem = {
      cart_item_id: `direct-${variantId}`, // แค่ต้องยูนีคพอ
      product_id: productId,
      variant_id: variantId,
      quantity: qty,
      subtotal: price * qty,

      // field เพิ่มเติมเผื่อ CartItemCard ใช้
      // ชื่อ field พวกนี้ต้องให้ตรงกับ type จริงของมึง ถ้าใช้ชื่ออื่นอยู่ก็แก้ให้ตรง
      product_name: productName ?? "สินค้า (ไม่ระบุชื่อ)",
      variant_name: variantName ?? undefined,
      image_url: image_url ?? undefined,

      store: {
        store_id: storeId,
        store_name: storeName,
      },
    } as any; // ถ้า TS ด่า field ไม่ครบ ก็ค่อยเติม field ตาม type CartItem จริงทีหลัง

    return {
      storeId,
      storeName,
      items: [directItem],
      storeTotal: price * qty,
    };
  }, [
    isDirect,
    storeId,
    storeName,
    unitPrice,
    qty,
    productId,
    variantId,
    productName,
    variantName,
    image_url,
  ]);

  // ─────────────────────────────
  // 3) group ตามร้าน
  //    - DIRECT → [directStoreGroup]
  //    - CART   → group จาก selectedItems
  // ─────────────────────────────
  const groupedStores = useMemo<StoreGroup[]>(() => {
    if (isDirect) {
      return directStoreGroup ? [directStoreGroup] : [];
    }

    const map = new Map<string, StoreGroup>();

    selectedItems.forEach((item) => {
      const storeId = item.store.store_id;
      const storeName = item.store.store_name;
      const subtotal = item.subtotal;

      const existing = map.get(storeId);
      if (existing) {
        existing.items.push(item);
        existing.storeTotal += subtotal;
      } else {
        map.set(storeId, {
          storeId,
          storeName,
          items: [item],
          storeTotal: subtotal,
        });
      }
    });

    return Array.from(map.values());
  }, [isDirect, directStoreGroup, selectedItems]);

  // selectedIds สำหรับส่งให้ CartStoreSection
  const effectiveSelectedIds = useMemo(() => {
    if (isDirect && directStoreGroup?.items[0]) {
      return new Set<string>([directStoreGroup.items[0].cart_item_id]);
    }
    return selectedIds;
  }, [isDirect, directStoreGroup, selectedIds]);

  // ─────────────────────────────
  // 4) คำนวณยอดรวม
  // ─────────────────────────────
  const itemsTotal = isDirect
    ? (directStoreGroup?.storeTotal ?? 0)
    : getSelectedTotal();

  const shippingTotal = groupedStores.length * SHIPPING_PER_STORE;
  const grandTotal = itemsTotal + shippingTotal;

  const handleChangeAddress = () => {
    router.push("/(address)/address-selected" as any);
  };

  // ปุ่มใช้ได้ไหม: CART → ต้องมี selectedItems, DIRECT → ต้องมี directStoreGroup
  const canPay = isDirect
    ? !!(selected && directStoreGroup)
    : !!(selected && selectedItems.length);

  // ─────────────────────────────
  // 5) กดชำระเงิน
  // ─────────────────────────────
  const handlePay = async () => {
    if (!selected) {
      alert("กรุณาเลือกที่อยู่จัดส่ง");
      return;
    }

    // DIRECT MODE
    if (isDirect) {
      if (!productId || !variantId) {
        alert("ข้อมูลสินค้าสำหรับซื้อเลยไม่ครบ");
        return;
      }

      setLoadingPay(true);
      try {
        const payload = {
          checkout_type: "DIRECT" as const,
          items: [
            {
              variant_id: variantId as string,
              quantity: qty,
            },
          ],
          shipping_address_id: selected.ship_addr_id,
        };

        console.log("direct payload", payload);
        const res = await checkoutCart(payload);

        // ✅ เพิ่ม: เก็บ order_ids + expires_at ถ้ามี
        orderIdsRef.current = (res as any)?.order_ids?.map(String) ?? [];
        const exp = (res as any)?.expires_at
          ? new Date((res as any).expires_at).getTime()
          : null;

        shouldCancelRef.current = true; // เปิด modal แล้ว ถ้า user ออกเองให้ cancel
        setStripeUrl(res.stripe_checkout_url);

        if (exp) {
          setExpiresAtMs(exp);
          setRemainingMs(exp - Date.now());
        } else {
          // ถ้า backend ยังไม่ส่ง expires_at มา ก็ไม่เปิด timer
          setExpiresAtMs(null);
          setRemainingMs(0);
        }

        console.log(res);
      } catch (e) {
        console.log("direct checkout error:", e);
        alert("ไม่สามารถสร้างการชำระเงินแบบซื้อเลยได้");
      } finally {
        setLoadingPay(false);
      }

      return;
    }

    // CART MODE
    if (!selectedItems.length) {
      alert("กรุณาเลือกสินค้าในตะกร้า");
      return;
    }

    setLoadingPay(true);
    try {
      const test = selectedItems.map((i) => {
        console.log(i.cart_item_id);
      });

      const effectiveCartId = cartIdParam ?? cartId ?? undefined;

      if (!effectiveCartId) {
        alert("ไม่พบ cart_id");
        return;
      }

      const payload = {
        checkout_type: "CART" as const,
        cart_id: effectiveCartId,
        selected_cart_item_ids: selectedItems.map((i) => i.cart_item_id),
        shipping_address_id: selected.ship_addr_id,
      };

      console.log("payload", payload);

      const res = await checkoutCart(payload);

      // ✅ เพิ่ม: เก็บ order_ids + expires_at ถ้ามี
      orderIdsRef.current = (res as any)?.order_ids?.map(String) ?? [];
      const exp = (res as any)?.expires_at
        ? new Date((res as any).expires_at).getTime()
        : null;

      shouldCancelRef.current = true; // เปิด modal แล้ว ถ้า user ออกเองให้ cancel
      setStripeUrl(res.stripe_checkout_url);

      if (exp) {
        setExpiresAtMs(exp);
        setRemainingMs(exp - Date.now());
      } else {
        setExpiresAtMs(null);
        setRemainingMs(0);
      }
    } catch (e) {
      console.log("cart checkout error:", e);
      alert("ไม่สามารถสร้างการชำระเงินได้");
    } finally {
      setLoadingPay(false);
    }
  };

  // ✅ แก้: closeStripe ให้ cancel reservation ถ้า user ออกเอง
  const closeStripe = async () => {
    if (shouldCancelRef.current) {
      shouldCancelRef.current = false;
      await cancelReservationOrders(orderIdsRef.current);
      await useCartStore.getState().backgroundSync();
    }

    setStripeUrl(null);
    setExpiresAtMs(null);
    setRemainingMs(0);
  };

  return (
    <Box flex={1} bg="coolGray.50">
      <AppBarNoCheck title="ทำการสั่งซื้อ" />

      <ScrollView
        flex={1}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
      >
        {/* 1) ที่อยู่จัดส่งของผู้ใช้ */}
        <Box mt={3}>
          <SelectedAddressCard
            address={selected}
            loading={loading && !addresses.length}
            onPressChange={handleChangeAddress}
          />
        </Box>

        {/* 2) ร้านที่ลูกค้าสั่ง (ทั้ง DIRECT และ CART ใช้ CartStoreSection เหมือนกัน) */}
        <Box mt={4}>
          {groupedStores.map((g) => (
            <Box
              key={g.storeId}
              mb={3}
              borderRadius="md"
              overflow="hidden"
              bg="white"
            >
              <CartStoreSection
                storeId={g.storeId}
                storeName={g.storeName}
                items={g.items}
                selectedIds={effectiveSelectedIds}
                onToggleStore={() => {}}
                onToggleItem={() => {}}
                onChangeQuantity={() => {}}
                onDeleteItem={async () => {}}
              />
            </Box>
          ))}
        </Box>

        {/* 3) วิธีชำระเงิน (radio จ่ายด้วยบัตรเครดิต) */}
        <Box mt={2} bg="white" borderRadius="md" p={3} shadow={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            วิธีการชำระเงิน
          </Text>

          <Radio.Group
            name="paymentMethod"
            value={paymentMethod}
            onChange={(val) => setPaymentMethod(val as "STRIPE_CARD")}
          >
            <Radio
              value="STRIPE_CARD"
              colorScheme="violet"
              _icon={{ color: "white" }}
              _checked={{
                borderColor: "violet.600",
                bg: "violet.600",
              }}
              _pressed={{
                borderColor: "violet.700",
                bg: "violet.700",
              }}
            >
              <Text fontSize="sm" ml={2}>
                ชำระด้วยบัตรเครดิต / เดบิต
              </Text>
            </Radio>
          </Radio.Group>
        </Box>

        {/* 4) ข้อมูลการชำระเงิน รวมยอดแต่ละร้าน + ยอดรวมทั้งหมด */}
        <Box mt={4} bg="white" borderRadius="md" p={3} shadow={1}>
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            ข้อมูลการชำระเงิน
          </Text>

          {groupedStores.map((g) => (
            <HStack key={g.storeId} justifyContent="space-between" mb={1}>
              <Text fontSize="xs" color="coolGray.700">
                {g.storeName}
              </Text>
              <Text fontSize="xs" color="coolGray.800">
                ฿{g.storeTotal.toFixed(2)}
              </Text>
            </HStack>
          ))}

          <Divider my={2} />

          <HStack justifyContent="space-between" mb={1}>
            <Text fontSize="xs" color="coolGray.700">
              รวมการสั่งซื้อ
            </Text>
            <Text fontSize="xs" color="coolGray.800">
              ฿{itemsTotal.toFixed(2)}
            </Text>
          </HStack>

          <HStack justifyContent="space-between" mb={1}>
            <Text fontSize="xs" color="coolGray.700">
              ค่าจัดส่ง
            </Text>
            <Text fontSize="xs" color="coolGray.800">
              ฿{shippingTotal.toFixed(2)}
            </Text>
          </HStack>

          <Divider my={2} />

          <HStack justifyContent="space-between">
            <Text fontSize="sm" fontWeight="semibold">
              ยอดชำระเงินทั้งหมด
            </Text>
            <Text fontSize="sm" fontWeight="semibold" color="violet.700">
              ฿{grandTotal.toFixed(2)}
            </Text>
          </HStack>
        </Box>
      </ScrollView>

      {/* 5) ปุ่มชำระสินค้าลอยข้างล่าง */}
      <Box
        position="absolute"
        left={0}
        right={0}
        bottom={0}
        bg="white"
        borderTopWidth={1}
        borderColor="coolGray.200"
        px={4}
        py={3}
      >
        <HStack justifyContent="space-between" alignItems="center">
          <VStack>
            <Text fontSize="xs" color="coolGray.600">
              รวมยอดสั่งซื้อ
            </Text>
            <Text fontSize="md" fontWeight="semibold" color="violet.700">
              ฿{grandTotal.toFixed(2)}
            </Text>
          </VStack>

          <Button
            borderRadius="full"
            px={10}
            onPress={handlePay}
            isLoading={loadingPay}
            isDisabled={!canPay}
          >
            ชำระเงิน
          </Button>
        </HStack>
      </Box>

      {/* Modal + WebView สำหรับ Stripe Checkout */}
      <RNModal
        visible={!!stripeUrl}
        animationType="slide"
        onRequestClose={closeStripe} // ✅ เปลี่ยนให้ cancel ได้
      >
        <Box flex={1} bg="white">
          {/* ✅ เพิ่มแถบ timer (ไม่ลบ AppBar เดิม) */}
          <Box px={4} py={2} borderBottomWidth={1} borderColor="coolGray.200">
            <HStack justifyContent="space-between" alignItems="center">
              <Text fontSize="xs" color="coolGray.600">
                เวลาที่เหลือ
              </Text>
              <Text
                fontSize="sm"
                fontWeight="semibold"
                color={remainingMs <= 10_000 ? "red.600" : "coolGray.800"}
              >
                {expiresAtMs ? formatMMSS(remainingMs) : "--:--"}
              </Text>
              <Button size="sm" variant="ghost" onPress={closeStripe}>
                ออก
              </Button>
            </HStack>
          </Box>

          <AppBarNoCheck title="ชำระด้วยบัตร" onBackPress={closeStripe} />

          {stripeUrl ? (
            <WebView
              source={{ uri: stripeUrl }}
              onMessage={(event) => {
                const msg = event.nativeEvent.data;
                if (msg === "GO_HOME") {
                  closeStripe(); // ปิด modal + cancel ถ้าจำเป็น
                  router.replace("/(tabs)"); // หรือ path จริงของมึง
                }
              }}
              // ✅ เพิ่ม: ดัก redirect success/cancel จาก Stripe
              onNavigationStateChange={(nav) => {
                const url = nav?.url || "";
                if (!url) return;

                // ถ้าสำเร็จ → ไม่ cancel
                if (url.includes("/payment/success")) {
                  shouldCancelRef.current = false;
                  const orderIds = orderIdsRef.current.join(",");
                  const paymentId = "";
                  setStripeUrl(null);
                  setExpiresAtMs(null);
                  setRemainingMs(0);
                  useCartStore.getState().backgroundSync();
                  router.replace({
                    pathname: "(checkout)/payment_success",
                    params: { order_ids: orderIds, payment_id: paymentId },
                  } as any);
                }

                // ถ้า cancel ใน Stripe → เช็คว่าเป็น decline หรือ user กดเองโดยดูจาก session
                if (url.includes("/payment/cancel")) {
                  (async () => {
                    try {
                      shouldCancelRef.current = false;

                      const sessionIdMatch = url.match(/session_id=([^&]+)/);
                      const sessionId = sessionIdMatch?.[1];

                      let declineCode: string | null = null;

                      if (sessionId) {
                        try {
                          const token = await getToken();
                          const res = await fetch(
                            `${DOMAIN}/api/payment/status-by-session/${sessionId}`,
                            { headers: { Authorization: `Bearer ${token}` } },
                          );
                          const json = await res.json();
                          // ถ้า status FAILED = บัตรถูก decline, ไม่ใช่ user กดยกเลิกเอง
                          if (json.status === "FAILED" || json.decline_code) {
                            declineCode =
                              json.decline_code || "generic_decline";
                          }
                        } catch (e) {
                          console.log("check payment status error:", e);
                        }
                      }

                      await cancelReservationOrders(orderIdsRef.current);
                      await useCartStore.getState().backgroundSync();

                      setStripeUrl(null);
                      setExpiresAtMs(null);
                      setRemainingMs(0);

                      if (declineCode) {
                        // Issue #5: บัตรถูก decline → ไปหน้า payment_failed พร้อมบอกสาเหตุ
                        router.replace({
                          pathname: "/(checkout)/payment_failed",
                          params: { decline_code: declineCode },
                        } as any);
                      } else {
                        // user กดยกเลิกเอง → ไปหน้า timeout เหมือนเดิม
                        router.replace("/(checkout)/payment_timeout" as any);
                      }
                    } catch (e) {
                      setStripeUrl(null);
                      setExpiresAtMs(null);
                      setRemainingMs(0);
                      router.replace("/(checkout)/payment_timeout" as any);
                    }
                  })();
                }
              }}
            />
          ) : null}
        </Box>
      </RNModal>
    </Box>
  );
};

export default CheckoutScreen;
