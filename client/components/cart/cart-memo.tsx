import {
  CartItem,
  deleteCartItems,
  getFullCart,
  updateCartItemQuantity,
  validateCheckout, // ⭐ กลับมาครบ
} from "@/api/cart";
import { create } from "zustand";

// Debounce สำหรับ update quantity
const DEBOUNCE = 1200;
const timers: Record<string, any> = {};

type CartState = {
  cartItems: CartItem[];
  selectedIds: Set<string>;
  loading: boolean;

  loadedOnce: boolean;       // โหลดครั้งแรกครั้งเดียว
  lastSync: number | null;   // เวลา sync ล่าสุด

  fetchCartFirstTime: () => Promise<void>;
  backgroundSync: () => Promise<void>;

  toggleItem: (id: string) => void;
  toggleStore: (storeId: string) => void;
  toggleAll: () => void;

  deleteSelected: () => Promise<void>;
  changeQuantity: (id: string, newQty: number) => void;

  getSelectedTotal: () => number;

  validateSelected: () => Promise<{
    is_valid: boolean;
    grand_total: number;
  }>;
};

export const useCartStore = create<CartState>((set, get) => ({
  cartItems: [],
  selectedIds: new Set(),
  loading: false,
  loadedOnce: false,
  lastSync: null,

  // -------------------------------------------------
  // ⭐ โหลดครั้งแรกเท่านั้น (ไม่โหลดซ้ำทุกหน้าแบบเก่า)
  // -------------------------------------------------
  async fetchCartFirstTime() {
    if (get().loadedOnce) return;

    set({ loading: true });

    try {
      const data = await getFullCart();
      set({
        cartItems: data.items,
        loadedOnce: true,
        lastSync: Date.now(),
      });
    } finally {
      set({ loading: false });
    }
  },

  // -------------------------------------------------
  // ⭐ Background Sync — เช็คราคา/สต็อกใหม่แบบช้า ๆ
  // -------------------------------------------------
  async backgroundSync() {
    const { lastSync } = get();

    // ป้องกัน spam sync
    if (lastSync && Date.now() - lastSync < 3000) return;

    try {
      const fresh = await getFullCart();
      set({
        cartItems: fresh.items,
        lastSync: Date.now(),
      });
    } catch (e) {
      console.log("background sync fail:", e);
    }
  },

  // -------------------------------------------------
  toggleItem(id) {
    const next = new Set(get().selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    set({ selectedIds: next });
  },

  toggleStore(storeId) {
    const { cartItems, selectedIds } = get();

    const storeItems = cartItems.filter(
      (i) => i.store.store_id === storeId
    );

    const allSelected = storeItems.every((i) =>
      selectedIds.has(i.cart_item_id)
    );

    const next = new Set(selectedIds);

    storeItems.forEach((i) => {
      allSelected
        ? next.delete(i.cart_item_id)
        : next.add(i.cart_item_id);
    });

    set({ selectedIds: next });
  },

  toggleAll() {
    const { cartItems, selectedIds } = get();

    if (selectedIds.size === cartItems.length) {
      set({ selectedIds: new Set() });
    } else {
      set({
        selectedIds: new Set(cartItems.map((i) => i.cart_item_id)),
      });
    }
  },

  // -------------------------------------------------
  // ⭐ ลบสินค้า → optimistic → API → background sync
  // -------------------------------------------------
  async deleteSelected() {
    const ids = Array.from(get().selectedIds);
    if (!ids.length) return;

    // optimistic remove
    set((prev) => ({
      cartItems: prev.cartItems.filter(
        (i) => !ids.includes(i.cart_item_id)
      ),
      selectedIds: new Set(),
    }));

    try {
      await deleteCartItems(ids);
      await get().backgroundSync();
    } catch (e) {
      console.log("delete error:", e);
      await get().backgroundSync();
    }
  },

  // -------------------------------------------------
  // ⭐ เพิ่ม/ลดจำนวน → optimistic + debounce + background sync
  // -------------------------------------------------
  changeQuantity(id, newQty) {
    const item = get().cartItems.find((i) => i.cart_item_id === id);
    if (!item) return;

    const maxStock = item.stock_available ?? Infinity;
    const safeQty = Math.min(newQty, maxStock);
    if (safeQty <= 0) return;

    // optimistic update
    set((prev) => ({
      cartItems: prev.cartItems.map((i) =>
        i.cart_item_id === id
          ? {
              ...i,
              quantity: safeQty,
              subtotal: safeQty * i.price_at_addition,
            }
          : i
      ),
    }));

    // clear debounce
    if (timers[id]) clearTimeout(timers[id]);

    timers[id] = setTimeout(async () => {
      try {
        const res = await updateCartItemQuantity(id, safeQty);

        set((prev) => ({
          cartItems: prev.cartItems.map((i) =>
            i.cart_item_id === id
              ? {
                  ...i,
                  quantity: res.quantity,
                  subtotal: res.subtotal,
                }
              : i
          ),
        }));
      } catch {
        await get().backgroundSync();
      }
    }, DEBOUNCE);
  },

  // -------------------------------------------------
  getSelectedTotal() {
    return get().cartItems
      .filter((i) => get().selectedIds.has(i.cart_item_id))
      .reduce((sum, i) => sum + i.subtotal, 0);
  },

  // -------------------------------------------------
  // ⭐ validate ก่อน checkout
  // -------------------------------------------------
  async validateSelected() {
    const ids = Array.from(get().selectedIds);
    if (!ids.length)
      return { is_valid: false, grand_total: 0 };

    try {
      const result = await validateCheckout(ids);

      // ⭐ ถ้าราคาหรือสต็อกเปลี่ยน → sync โชว์ state ใหม่
      await get().backgroundSync();

      return {
        is_valid: result.is_valid,
        grand_total: result.grand_total,
      };
    } catch (e) {
      console.log("validate error:", e);
      return { is_valid: false, grand_total: 0 };
    }
  },
}));
