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

export default function HomeScreen() {
  const [search, setSearch] = useState("");
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [categories, setCategories] = useState<HomeCategory[]>([]);
  const [products, setProducts] = useState<HomeProduct[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleSubmitSearch = () => {
    // ไว้ทีหลังจะให้วิ่งไปหน้า search ก็ได้
    console.log("search:", search);
    // router.push({ pathname: "/(customer)/search", params: { q: search } } as any);
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
          <HomeCategoryList
          categories={categories}
          getBackgroundColor={(cat) => {
            switch (cat.id) {
              case "shirt":
                return "#fee2e2"; // แดงอ่อน
              case "tshirt":
                return "#dbeafe"; // น้ำเงินอ่อน
              case "sport":
                return "#dcfce7"; // เขียวอ่อน
              case "cute":
                return "#fef3c7"; // เหลืองอ่อน
              default:
                return undefined; // ไปใช้ค่า default แทน
            }
          }}
        />
          <HomeProductGrid products={products} />
        </ScrollView>
      )}
    </Box>
  );
}
