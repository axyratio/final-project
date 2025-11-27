// app/(home)/categories/index.tsx
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, Pressable } from "react-native";
import { Box, Spinner, Text } from "native-base";
import { useLocalSearchParams, useRouter } from "expo-router";

import { HomeNavbar } from "@/components/navbar";
import { HomeProductGrid } from "@/components/grid";
import { fetchCategoryPageData, CategoryProduct } from "@/api/home";
import type { HomeCategory } from "@/api/home";

export default function CategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    categoryId?: string;
    categoryName?: string;
  }>();

  const [search, setSearch] = useState("");
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<CategoryProduct[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchCategoryPageData();
        setCategories(data.categories);
        setProducts(data.products);

        // เลือกหมวดเริ่มต้น
        const initialIdFromParam = params.categoryId
          ? String(params.categoryId)
          : null;

        if (
          initialIdFromParam &&
          data.categories.some((c) => c.id === initialIdFromParam)
        ) {
          setSelectedCategoryId(initialIdFromParam);
        } else if (data.categories.length > 0) {
          setSelectedCategoryId(data.categories[0].id);
        }
      } catch (e) {
        console.log("Category page load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params.categoryId]);

  // แปลง id → name ก่อน แล้วค่อยเอาไปกรองกับ product.categoryId (ภาษาไทย)
  const selectedCategoryName = useMemo(() => {
    const cat = categories.find((c) => c.id === selectedCategoryId);
    return cat?.name ?? null; // เช่น "เสื้อกีฬา"
  }, [categories, selectedCategoryId]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryName) return [];
    return products.filter((p) => p.categoryId === selectedCategoryName);
  }, [products, selectedCategoryName]);

  const handleSubmitSearch = () => {
    console.log("search in category:", search);
  };

  const handleChangeCategory = (cat: HomeCategory) => {
    setSelectedCategoryId(cat.id);
    router.setParams({ categoryId: cat.id, categoryName: cat.name } as any);
  };

  return (
    <Box flex={1} bg="#f7f4ff">
      <HomeNavbar
        searchValue={search}
        onChangeSearch={setSearch}
        onSubmitSearch={handleSubmitSearch}
      />

      {loading ? (
        <Box flex={1} alignItems="center" justifyContent="center">
          <Spinner color="#7c3aed" />
        </Box>
      ) : (
        <>
          {/* แถบตัวหนังสือเลือกหมวดหมู่ด้านบน */}
          <Box mt={2} px={4}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 8 }}
            >
              {categories.map((cat) => {
                const isActive = cat.id === selectedCategoryId;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => handleChangeCategory(cat)}
                    style={{ marginRight: 16 }}
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: isActive ? "700" : "400",
                        color: isActive ? "#7c3aed" : "#6b7280",
                        textDecorationLine: isActive ? "underline" : "none",
                      }}
                    >
                      {cat.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Box>

          {/* Grid สินค้าของหมวดที่เลือก */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            <HomeProductGrid products={filteredProducts} />
          </ScrollView>
        </>
      )}
    </Box>
  );
}
