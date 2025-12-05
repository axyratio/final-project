import {
  Box,
  ScrollView,
  Spinner,
  Text,
  useToast,
} from "native-base";
import React, { useEffect, useMemo } from "react";
import { SafeAreaView } from "react-native";

import { deleteCartItems } from "@/api/cart";
import { CartBottomBar } from "@/components/cart/card-bottom-bar";
import { CartStoreSection } from "@/components/cart/card-store-section";
import { useCartStore } from "@/components/cart/cart-memo";
import { AppBarNoCheck } from "@/components/navbar";

const CartScreen: React.FC = () => {
  const toast = useToast();

  const {
    cartItems,
    selectedIds,
    loading,
    fetchCartFirstTime,
    toggleItem,
    toggleStore,
    toggleAll,
    changeQuantity,
    getSelectedTotal,
    validateSelected,
    backgroundSync,
  } = useCartStore();

  // ----------- โหลดเฉพาะตอนเปิดครั้งแรก -----------
  useEffect(() => {
    let executed = false;

    if (!executed) {
      fetchCartFirstTime();
      backgroundSync(); // โหลดเบื้องหลังแบบ Shopee
      executed = true;
    }

    return () => {
      executed = true;
    };
  }, []);

  const stores = useMemo(() => {
    const m = new Map();
    cartItems.forEach((item) => {
      const id = item.store.store_id;
      if (!m.has(id)) {
        m.set(id, {
          store_id: id,
          store_name: item.store.store_name,
          items: [],
        });
      }
      m.get(id).items.push(item);
    });
    return Array.from(m.values());
  }, [cartItems]);

  const allSelected =
    cartItems.length > 0 && selectedIds.size === cartItems.length;

  const total = getSelectedTotal();

  const handleDeleteOne = async (id: string) => {
    try {
      await deleteCartItems([id]);
      useCartStore.getState().backgroundSync();
    } catch (e) {
      toast.show({ description: "ลบสินค้าไม่สำเร็จ" });
    }
  };

  const handlePressOrder = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) {
      toast.show({ description: "กรุณาเลือกสินค้าที่ต้องการสั่งซื้อ" });
      return;
    }

    try {
      const result = await validateSelected();
      if (!result.is_valid) {
        toast.show({
          description:
            "สินค้าบางรายการมีสต็อกไม่พอหรือราคามีการเปลี่ยนแปลง",
        });
        return;
      }

      toast.show({
        description: `พร้อมชำระเงิน ยอดรวม ฿${result.grand_total}`,
      });
      
      // TODO ไปหน้า Payment
    } catch (e) {
      toast.show({ description: "ตรวจสอบตะกร้าไม่สำเร็จ" });
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#f3f4f6" }}>
      <AppBarNoCheck title="รถเข็น" />

      <Box flex={1} bg="coolGray.100" pb={16}>
        {loading ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Spinner color="violet.600" />
          </Box>
        ) : cartItems.length === 0 ? (
          <Box flex={1} justifyContent="center" alignItems="center">
            <Text color="coolGray.500">ยังไม่มีสินค้าในรถเข็น</Text>
          </Box>
        ) : (
          <ScrollView>
            {stores.map((store) => (
              <CartStoreSection
                key={store.store_id}
                storeId={store.store_id}
                storeName={store.store_name}
                items={store.items}
                selectedIds={selectedIds}
                onToggleStore={toggleStore}
                onToggleItem={toggleItem}
                onChangeQuantity={changeQuantity}
                onDeleteItem={handleDeleteOne}
              />
            ))}
          </ScrollView>
        )}

        <CartBottomBar
          allSelected={allSelected}
          onToggleAll={toggleAll}
          totalPrice={total}
          onPressOrder={handlePressOrder}
          disabled={cartItems.length === 0}
        />
      </Box>
    </SafeAreaView>
  );
};

export default CartScreen;
