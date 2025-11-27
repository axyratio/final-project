// app/(store)/my-store.tsx   (ชื่อไฟล์ตามโปรเจกต์เดิม แทนที่โค้ด MyStoreScreen เดิม)
import ProductCard, { CategoryCard } from "@/components/card";
import StoreHeader from "@/components/header";
import { AppBarMore, AppBarNoCheck } from "@/components/navbar";
import MyTabs from "@/components/tab";
import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";

import { Ionicons } from "@expo/vector-icons";
import { useIsFocused, useNavigationState } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Box, Center, Spinner, Text } from "native-base";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";

const STORE_API_BASE = `${DOMAIN}/stores`;

type StoreInfo = {
  store_id: string;
  name: string;
  logo_url?: string | null;
  rating: number;
  is_stripe_verified: boolean;
};

type StoreProductItem = {
  product_id: string;
  title: string;
  price: number;
  star: number;
  image_id?: string | null;
  image_url?: string | null;
  category?: string;
};

type StoreDashboardResponse = {
  store: StoreInfo;
  products: StoreProductItem[];
};

export default function MyStoreScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ initialTab?: "products" | "categories" }>();
  const isFocused = useIsFocused();
  const [store, setStore] = useState<StoreInfo | null>(null);
  const [products, setProducts] = useState<StoreProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState(false);



  const isSeller = true; // หน้านี้เป็นของ seller อยู่แล้ว

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (!isRefresh) {
        setLoading(true);
      }
      const token = await getToken();
      if (!token) {
        router.replace("/(auth)/login");
        return;
      }
      const res = await fetch(`${STORE_API_BASE}/me/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        console.log("get store dashboard error", res.status);
        return;
      }

      const json = (await res.json()) as { data: StoreDashboardResponse };
      const data = json.data;

      console.log(data)

      if (data.store) {
        // ถ้า logo_url ไม่มี http/https นำหน้า ให้เติม DOMAIN เข้าไป
        if (data.store.logo_url && !data.store.logo_url.startsWith('http')) {
          data.store.logo_url = `${DOMAIN}${data.store.logo_url}`;
        }
        setStore(data.store);
      } else {
        setStore(null);
      }
      setProducts(data.products || []);
    } catch (e) {
      console.log("fetch store dashboard error", e);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
    fetchDashboard();
    }
  }, [isFocused]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboard(true);
  }, []);

  // ฟังก์ชันสำหรับขอ refresh link ของ Stripe
  const handleRefreshStripeLink = async () => {
    console.log("Requesting Stripe refresh link...");
    try {
      const token = await getToken();
      const res = await fetch(`${DOMAIN}/store/connect/refresh-link`, {
        method: "GET", // หรือ POST ตามที่ backend กำหนด
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        console.error("Failed to get refresh link:", json.message);
        return;
      }

      const refreshLink = json.data.onboarding_link;
      if (refreshLink) {
        await WebBrowser.openBrowserAsync(refreshLink);
      }
    } catch (e) {
      console.error("Error fetching refresh link:", e);
    }
  };

  if (loading) {
    return (
      <Box flex={1} bg="white">
        <AppBarNoCheck title="ร้านค้าของฉัน" onBackPress={() => {}}/>
        <Center flex={1}>
          <Spinner size="lg" color="violet.500" />
        </Center>
      </Box>
    );
  }

  // เนื้อหา tab: รายการสินค้า
  const productTabContent = (
    <ScrollView
      contentContainerStyle={styles.productListContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {products.length === 0 ? (
        <Text textAlign="center" color="gray.400">
          ยังไม่มีสินค้าในร้านของคุณ
        </Text>
      ) : (
        <View style={styles.productGrid}>
          {products.map((p) => {
            const imageUrl = p.image_id
              ? `${DOMAIN}/images/stream/${p.image_id}`
              : p.image_url || undefined;
            return (
              <ProductCard
                key={p.product_id}
                productId={p.product_id}
                title={p.title}
                price={p.price}
                star={p.star}
                imageUrl={imageUrl}
                route={`/(store)/add-product?productId=${p.product_id}`}
                isSeller={isSeller}
                onToggleFavorite={() => {
                  // TODO: call wishlist API
                  console.log("toggle favorite", p.product_id);
                }}
              />
            );
          })}
        </View>
      )}
    </ScrollView>
  );

  // จัดกลุ่มสินค้าตามหมวดหมู่
  const productsByCategory = products.reduce((acc, product) => {
    const categoryName = product.category || "ไม่มีหมวดหมู่";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, StoreProductItem[]>);

  // เนื้อหา tab: หมวดหมู่
  const categoryTabContent = (
    <ScrollView
      contentContainerStyle={styles.productListContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.productGrid}>
        {Object.keys(productsByCategory).map((categoryName) => {
          const categoryProducts = productsByCategory[categoryName];
          const firstProduct = categoryProducts[0];
          const coverImageUrl = firstProduct?.image_id
            ? `${DOMAIN}/images/stream/${firstProduct.image_id}`
            : firstProduct?.image_url || undefined;

          return (
            <CategoryCard
              key={categoryName}
              categoryName={categoryName}
              productCount={categoryProducts.length}
              coverImageUrl={coverImageUrl}
              onPress={() => {
                router.replace(
                  `/(store)/category-tab?categoryName=${encodeURIComponent(categoryName)}`
                );
              }}
            />
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <Box flex={1} bg="white">
      <AppBarMore title="ร้านค้าของฉัน" />

      {/* Store header + chat + stripe status */}
      <StoreHeader
        urlLogo={store?.logo_url}
        title={store?.name || "ร้านของฉัน"}
        storeId={store?.store_id}
        rating={store?.rating ?? 0}
        // viewStoreRoute={"/(store)/view-store"}
        editStoreRoute={"/(store)/edit-store"}
        chatRoute={`/chat/store/${store?.store_id ?? ""}`}
        isStripeVerified={store?.is_stripe_verified ?? false}
        onRefreshStripe={handleRefreshStripeLink}
      />

      {/* Tabs: รายการสินค้า / หมวดหมู่ */}
      <MyTabs
        productContent={productTabContent}
        categoryContent={categoryTabContent}
        initialTab={params.initialTab}
      />

      {/* Floating add button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.replace("/(store)/add-product" as any)}
      >
        <Ionicons name="add" size={32} color="#fff" />
      </TouchableOpacity>
    </Box>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    zIndex: 999,
    elevation: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
  },
  productListContainer: {
    paddingBottom: 80,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
});
