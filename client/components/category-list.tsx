// components/category-list.tsx
import { HomeCategory } from "@/api/home";
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Image, Pressable, ScrollView } from "react-native";

// map categoryId → local image asset (ถ้าอยากใช้รูป local)
const categoryIcons: Record<string, any> = {
  shirt: require("../assets/categories/shirt.png"),
  tshirt: require("../assets/categories/tshirt.png"),
  sport: require("../assets/categories/sport.png"),
  cute: require("../assets/categories/cute.png"),
};

type Props = {
  categories: HomeCategory[];

  // 🆕 ถ้าอยากคุมสีจากฝั่ง component มากกว่า API
  // จะส่งฟังก์ชันนี้มาก็ได้ (ถ้าไม่ส่ง จะใช้ backgroundColor จาก cat หรือ default)
  getBackgroundColor?: (cat: HomeCategory) => string | undefined;
};

export const HomeCategoryList: React.FC<Props> = ({
  categories,
  getBackgroundColor,
}) => {
  const router = useRouter();

  const handlePressCategory = (category: HomeCategory) => {
  router.push({
    pathname: "/(home)/categories",
    params: {
      categoryId: category.id,
      categoryName: category.name,
    },
  } as any);
};

  if (!categories.length) return null;

  return (
    <Box mt={6}>
      <Text px={4} mb={3} fontWeight="600" fontSize="md">
        หมวดหมู่
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}
      >
        {categories.map((cat) => {
          const iconSource =
            categoryIcons[cat.id] ||
            (cat.iconUrl ? { uri: cat.iconUrl } : null);

          // ✅ เลือกสีพื้นหลังตามลำดับความสำคัญ:
          // 1) getBackgroundColor(prop)
          // 2) cat.backgroundColor จาก API
          // 3) default สีเทาอ่อน
          const bgColor =
            getBackgroundColor?.(cat) || cat.backgroundColor || "#f5f5f5";

          return (
            <Pressable
              key={cat.id}
              onPress={() => handlePressCategory(cat)}
              style={{ marginRight: 16, alignItems: "center" }}
            >
              <Box
                width={16}
                height={16}
                borderRadius={999}
                bg={bgColor}
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
              >
                {iconSource && (
                  <Image
                    source={iconSource}
                    style={{ width: 40, height: 40, resizeMode: "contain" }}
                  />
                )}
              </Box>
              <Text mt={1} fontSize="xs">
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};
