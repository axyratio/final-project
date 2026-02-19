// File: components/category-list.tsx

import { HomeCategory } from "@/api/home";
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Image, Pressable, ScrollView, View } from "react-native";
import { SvgUri } from "react-native-svg";

// Default colors for categories (cycling through these colors)
const defaultCategoryColors: string[] = [
  "#E3F2FD", // Light Blue
  "#FFF9C4", // Light Yellow
  "#F3E5F5", // Light Purple
  "#FCE4EC", // Light Pink
  "#E8F5E9", // Light Green
  "#FFF3E0", // Light Orange
  "#F3E5F5", // Light Lavender
  "#FFE0B2", // Light Peach
];

type Props = {
  categories: HomeCategory[];
};

/**
 * Component สำหรับแสดงไอคอนหมวดหมู่
 * รองรับทั้ง SVG และรูปภาพปกติ (PNG, JPG)
 */
const CategoryIcon: React.FC<{
  iconUrl?: string;
  categoryName: string;
  size?: number;
}> = ({ iconUrl, categoryName, size = 40 }) => {
  // ไม่มีไอคอน → แสดงตัวอักษรแรก
  if (!iconUrl) {
    return (
      <Text fontSize="2xl" fontWeight="bold" color="gray.600">
        {categoryName.charAt(0)}
      </Text>
    );
  }

  // ตรวจสอบว่าเป็น SVG หรือไม่
  const isSvg =
    iconUrl.toLowerCase().endsWith(".svg") ||
    iconUrl.includes("image/svg") ||
    iconUrl.includes(".svg?");

  // แสดง SVG
  if (isSvg) {
    return (
      <SvgUri
        uri={iconUrl}
        width={size}
        height={size}
        onError={(error) => {
          console.warn("SVG load error:", error);
        }}
      />
    );
  }

  // แสดงรูปภาพปกติ (PNG, JPG, etc.)
  return (
    <Image
      source={{ uri: iconUrl }}
      style={{ width: size, height: size, resizeMode: "contain" }}
      onError={(error) => {
        console.warn("Image load error:", error);
      }}
    />
  );
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
        {categories.map((cat, index) => {
          // Cycle through colors for variety
          const bgColor =
            defaultCategoryColors[index % defaultCategoryColors.length];

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
                <CategoryIcon
                  iconUrl={cat.iconUrl}
                  categoryName={cat.name}
                  size={40}
                />
              </Box>
              <Text
                mt={1}
                fontSize="xs"
                numberOfLines={1}
                maxW={16}
                textAlign="center"
              >
                {cat.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Box>
  );
};