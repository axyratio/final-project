// app/(customer)/product-detail.tsx

import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Box, Text } from "native-base";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

import { addToCart, getCartSummary } from "@/api/cart";
import {
  getProductDetail,
  ProductDetailDto,
  ProductVariantDto,
} from "@/api/products";
import {
  ExpandableDescription,
  ProductHeader,
  StoreHeaderProductDetail,
} from "@/components/header";
import { IconWithBadge } from "@/components/icon";
import { ProductMainImage, ProductThumbnailStrip } from "@/components/image";
import { ModalMode, VariantSelectModal } from "@/components/modal";
import { ReviewPreviewSection } from "@/components/review/header";

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; productId?: string }>();
  const productId = (params.productId || params.id) as string | undefined;

  const [product, setProduct] = useState<ProductDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("add_to_cart");

  const [cartCount, setCartCount] = useState(0);

  const loadCartCount = async () => {
    try {
      const summary = await getCartSummary();
      setCartCount(summary.itemCount);
    } catch (e) {
      console.log("load cart summary error", e);
    }
  };

  useEffect(() => {
    if (!productId) return;

    const fetchDetail = async () => {
      try {
        const detail = await getProductDetail(productId);
        detail.images.sort((a, b) => a.displayOrder - b.displayOrder);
        setProduct(detail);

        console.log("[ProductDetail] loaded", JSON.stringify(detail, null, 2));
      } catch (e) {
        console.log("load product detail error", e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
    loadCartCount();
  }, [productId]);

  // ✅ helper: เช็คว่ามีรูป VTON อย่างน้อย 1 รูปใน variants ไหม
  const hasAnyVtonImage = (p: ProductDetailDto | null) => {
    if (!p?.variants?.length) return false;
    return p.variants.some((v) =>
      (v.images || []).some((img) => img.imageType === "VTON")
    );
  };

  // ✅ helper: ส่ง variants เข้า modal แบบ "ตัด NORMAL ทิ้ง" เฉพาะโหมด try_on
  const getVariantsWithVtonImagesOnly = (p: ProductDetailDto | null) => {
    if (!p?.variants?.length) return [];
    return p.variants.map((v) => ({
      ...v,
      images: (v.images || []).filter((img) => img.imageType === "VTON"),
    }));
  };

  const openVariantModal = (mode: ModalMode) => {
    // ✅ เงื่อนไขตามที่สั่ง: อยู่ในปุ่ม "ลองเสื้อ" เท่านั้น
    if (mode === "try_on") {
      if (!hasAnyVtonImage(product)) {
        Alert.alert("ลองเสื้อไม่ได้", "ร้านค้าไม่ได้เพิ่มเสื้อสำหรับลองเสื้อ");
        return;
      }
    }

    setModalMode(mode);
    setModalVisible(true);
  };

  const handleConfirmVariant = async (payload: {
    variant: ProductVariantDto;
    quantity: number;
  }) => {
    const { variant, quantity } = payload;

    if (!product) return;

    if (modalMode === "add_to_cart") {
      try {
        await addToCart({
          productId: product.productId,
          variantId: variant.variantId,
          quantity,
        });
        await loadCartCount();
      } catch (e) {
        console.log("add to cart error", e);
      } finally {
        setModalVisible(false);
      }
      return;
    }

    if (modalMode === "try_on") {
      setModalVisible(false);

      // ✅ router ไปหน้า vton แล้ว "เปิดแท็บเสื้อจากสินค้า" ทันที
router.push({
  pathname: "/(tabs)/vton",
  params: {
    productId: product.productId,
    variantId: variant.variantId,
    tabId: "outfit",
    outfitTabId: "product",
  },
} as any);

      return;
    }

    if (modalMode === "buy_now") {
      setModalVisible(false);
      router.push({
        pathname: "/(checkout)/checkout",
        params: {
          productId: product.productId,
          variantId: variant.variantId,
          quantity: String(quantity),
          storeId: product.store.storeId,
          storeName: product.store.name,
          unitPrice: String(variant.price ?? product.basePrice),
          productName: product.productName,
          variantName: variant.variantName ?? "",
          image_url: product.images[0]?.imageUrl || "",
        },
      } as any);
      return;
    }
  };

  if (loading) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <ActivityIndicator />
        <Text mt={2}>กำลังโหลดสินค้า...</Text>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box flex={1} justifyContent="center" alignItems="center">
        <Text>ไม่พบสินค้า</Text>
      </Box>
    );
  }

  const variantsForModal =
    modalMode === "try_on"
      ? getVariantsWithVtonImagesOnly(product)
      : product.variants;

  return (
    <Box flex={1} bg="#f3f4f6">
      <StatusBar style="light" backgroundColor="#4c1d95" />
      <Box safeAreaTop bg="violet.600" />

      {/* overlay ปุ่มบนสุด */}
      <View
        style={{
          position: "absolute",
          top: 15,
          left: 0,
          right: 0,
          zIndex: 20,
          paddingTop: 32,
          paddingHorizontal: 16,
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 32,
            height: 32,
            borderRadius: 999,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="arrow-back" size={18} color="#fff" />
        </Pressable>

        <View style={{ flexDirection: "row" }}>
          <Pressable
            onPress={() => router.push({ pathname: "/(cart)/cart" } as any)}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 8,
            }}
          >
            <IconWithBadge
              count={cartCount}
              icon={
                <Ionicons
                  onPress={() => router.push("/(cart)/cart")}
                  name="cart-outline"
                  size={20}
                  color="#fff"
                />
              }
            />
          </Pressable>

          <Pressable
            onPress={() => console.log("toggle favorite")}
            style={{
              width: 32,
              height: 32,
              borderRadius: 999,
              backgroundColor: "rgba(0,0,0,0.4)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="heart-outline" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      {/* ภาพสินค้า */}
      <ProductMainImage
        images={product.images}
        selectedIndex={selectedImageIndex}
        onChangeIndex={(idx) => setSelectedImageIndex(idx)}
      />

      <ProductThumbnailStrip
        images={product.images}
        selectedIndex={selectedImageIndex}
        onSelect={(idx) => setSelectedImageIndex(idx)}
      />

      {/* หัวข้อ + ราคา + ปุ่มลองเสื้อ/ตะกร้า */}
      <ProductHeader
        product={product}
        onPressAddToCart={() => openVariantModal("add_to_cart")}
        onPressTryOn={() => openVariantModal("try_on")}
      />

      {/* ร้านค้า + แชท */}
      <StoreHeaderProductDetail
        product={product}
        onPressViewStore={() =>
          router.push({
            pathname: "/(customer)/store-detail",
            params: { storeId: product.store.storeId },
          } as any)
        }
        onPressChat={() => console.log("chat with store")}
      />

      {/* รีวิวตัวอย่าง + ปุ่มดูทั้งหมด */}
      <ReviewPreviewSection
        productId={product.productId}
        bestReview={product.bestReview}
        reviewCount={product.reviewCount}
      />

      {/* คำอธิบายสินค้า */}
      <ExpandableDescription text={product.description ?? ""} />

      {/* ปุ่มซื้อเลยด้านล่าง */}
      <Box
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        bg="white"
        p={4}
        borderTopWidth={1}
        borderColor="#e5e7eb"
      >
        <Pressable
          onPress={() => openVariantModal("buy_now")}
          style={{
            backgroundColor: "#7c3aed",
            borderRadius: 999,
            paddingVertical: 14,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>ซื้อเลย</Text>
        </Pressable>
      </Box>

      {/* modal เลือก variant ใช้ร่วม 3 โหมด */}
      <VariantSelectModal
        visible={modalVisible}
        mode={modalMode}
        variants={variantsForModal} // ✅ try_on จะเหลือเฉพาะรูป VTON
        onClose={() => setModalVisible(false)}
        onConfirm={handleConfirmVariant}
      />
    </Box>
  );
}
