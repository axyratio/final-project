// components/grid.tsx
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { View } from "react-native";

import { HomeProduct } from "@/api/home";
import ProductCard from "@/components/card";
import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;

type HomeProductGridProps = {
  products: HomeProduct[];
  isSeller?: boolean;
  onToggleFavorite?: (productId: string) => void;
  isShowTitle?: boolean;
  title?: string;
};

export const HomeProductGrid: React.FC<HomeProductGridProps> = ({
  products,
  isSeller = false,
  isShowTitle = false,
  title,
  onToggleFavorite,
}) => {
  const router = useRouter();

  console.log("HomeProductGrid received products:", products);

  if (!products || products.length === 0) {
    return (
      <Box mt={6} px={4}>
        <Text color="gray.500" fontSize="sm">
          ยังไม่มีสินค้า
        </Text>
      </Box>
    );
  }

  return (
    <Box mt={6} px={4}>
      {isShowTitle && (
        <Text mb={3} fontWeight="600" fontSize="md">
          {title}
        </Text>
      )}

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {products.map((p) => {
          const imageUrl = p.imageId
            ? `${API_BASE_URL}/images/stream/${p.imageId}`
            : p.imageUrl;

          // components/grid.tsx
          return (
            <ProductCard
              key={p.id}
              productId={p.id}
              title={p.title}
              price={p.price}
              star={p.rating}
              imageUrl={imageUrl}
              // ✅ ส่ง productId ไปเป็น query param
              route={`/(home)/product-detail?productId=${encodeURIComponent(p.id)}`}
              isSeller={isSeller}
              onToggleFavorite={
                onToggleFavorite ? () => onToggleFavorite(p.id) : undefined
              }
            />
          );
        })}
      </View>
    </Box>
  );
};
