// components/category.tsx
import React, { useEffect, useState } from "react";
import { ScrollView, Pressable } from "react-native";
import { Box, Spinner, Text } from "native-base";

// type ที่ export ใช้ทั้งหน้าบ้านและ store
export type Category = {
  id: string;   // slug / uuid
  name: string; // ชื่อภาษาไทยที่โชว์
};

type CategoryListProps = {
  onSelect: (category: Category) => void;
};

// mock data ตอนนี้ยังไม่ได้ดึงจาก backend จริง
const mockCategoryResponse: { categories: Category[] } = {
  categories: [
    { id: "tshirt",    name: "เสื้อยืด" },
    { id: "shirt",     name: "เสื้อเชิ้ต" },
    { id: "formal",    name: "เสื้อทางการ" },
    { id: "cute",      name: "เสื้อน่ารัก" },
    { id: "sport",     name: "เสื้อกีฬา" },
    { id: "sleepwear", name: "ชุดนอน" },
    { id: "longsleeve", name: "เสื้อแขนยาว" },
  ],
};

export default function CategoryList({ onSelect }: CategoryListProps) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // จำลองการเรียก backend
    const timer = setTimeout(() => {
      setCategories(mockCategoryResponse.categories);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center">
        <Spinner />
        <Text mt={2}>กำลังโหลดหมวดหมู่...</Text>
      </Box>
    );
  }

  return (
    <ScrollView>
      <Box>
        {categories.map((cat) => (
          <CategoryItem key={cat.id} item={cat} onPress={onSelect} />
        ))}
      </Box>
    </ScrollView>
  );
}

type CategoryItemProps = {
  item: Category;
  onPress: (item: Category) => void;
};

export function CategoryItem({ item, onPress }: CategoryItemProps) {
  return (
    <Pressable onPress={() => onPress(item)}>
      <Box
        px={4}
        py={3}
        borderBottomWidth={1}
        borderColor="#eee"
        backgroundColor="white"
      >
        <Text fontSize="md">{item.name}</Text>
      </Box>
    </Pressable>
  );
}
