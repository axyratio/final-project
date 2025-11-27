// app/(store)/categories.tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import { Box } from "native-base";
import React from "react";

import CategoryList, { Category } from "@/components/category";
import { AppBarNoCheck } from "@/components/navbar";

export default function CategoriesScreen() {
  const router = useRouter();

  // รับ params เดิมจากหน้า AddProductScreen
  const params = useLocalSearchParams<{
    productId?: string;
    productName?: string;
    productDesc?: string;
    minBuy?: string;
    categoryId?: string;
    categoryName?: string;
    variant?: string;
    images?: string;
  }>();

  const handleSelect = (category: Category) => {
    // ส่งค่ากลับไปหน้าเพิ่มสินค้า + พก params เก่าไปด้วย
    router.replace({
      pathname: "/(store)/add-product",
      params: {
        ...params,
        categoryId: category.id,   // 🆕 ส่ง slug / uuid
        categoryName: category.name,
      },
    } as any);
  };

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title="เลือกหมวดหมู่" />
      <CategoryList onSelect={handleSelect} />
    </Box>
  );
}
