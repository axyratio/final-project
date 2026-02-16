// app/index.tsx
import { Box, Spinner } from "native-base";
import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";

import {
  fetchHomeData,
  HomeBanner,
  HomeCategory,
  HomeProduct,
} from "@/api/home";
import { HomeBannerSlider } from "@/components/banner";
import { HomeCategoryList } from "@/components/category-list";
import { HomeProductGrid } from "@/components/grid";
import { HomeNavbar } from "@/components/navbar";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchHomeData();
        setBanners(data.banners);
        setCategories(data.categories);
        setProducts(data.products);
      } catch (e) {
        console.log("Home load error:", e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ฟังก์ชันสำหรับ submit การค้นหา
  const handleSubmitSearch = () => {
    const trimmedSearch = search.trim();
    if (trimmedSearch) {
      router.push({
        pathname: "/(home)/search",
        params: { q: trimmedSearch }
      } as any);
    } else {
      // ถ้าไม่มีคำค้นหา ให้ไปหน้าค้นหาทั้งหมด
      router.push("/(home)/search" as any);
    }
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
        <ScrollView
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <HomeBannerSlider banners={banners} />
          <HomeCategoryList categories={categories} />
          <HomeProductGrid products={products} />
        </ScrollView>
      )}
    </Box>
  );
}