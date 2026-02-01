// File: components/category-list.tsx

import { HomeCategory } from "@/api/home";
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Image, Pressable, ScrollView } from "react-native";

// Map category slug → local image asset
const categoryIcons: Record<string, any> = {
  shirt: require("../assets/categories/shirt.png"),
  tshirt: require("../assets/categories/tshirt.png"),
  sport: require("../assets/categories/sport.png"),
  cute: require("../assets/categories/cute.png"),
};

// Default colors for categories (can be customized)
const defaultCategoryColors: Record<string, string> = {
  shirt: "#E3F2FD",
  tshirt: "#FFF9C4",
  sport: "#F3E5F5",
  cute: "#FCE4EC",
};

type Props = {
  categories: HomeCategory[];
};

export const HomeCategoryList: React.FC<Props> = ({ categories }) => {
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
          const iconSource = categoryIcons[cat.id] || null;
          const bgColor = defaultCategoryColors[cat.id] || "#f5f5f5";

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