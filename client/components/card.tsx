// components/card.tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Box, Text } from "native-base";
import React from "react";
import { Image, Pressable } from "react-native";

type ProductCardProps = {
  productId: string;
  title: string;
  price: number;
  star: number;
  imageUrl?: string;
  route: string;
  isSeller?: boolean;
  onToggleFavorite?: () => void;

  isActive?: boolean;       // true=กำลังขาย, false=ปิดการขาย
  onCloseSale?: () => void; // ปิดการขาย
  onOpenSale?: () => void;  // เปิดการขาย
};

function EditIconButton({ route }: { route: string }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        if (!route) return;
        router.push(route as any);
      }}
      style={{ padding: 4 }}
    >
      <Ionicons name="create-outline" size={18} color="#8025ca" />
    </Pressable>
  );
}

export default function ProductCard({
  productId,
  title,
  price,
  star,
  imageUrl,
  route,
  isSeller = false,
  onToggleFavorite,
  isActive = true,
  onCloseSale,
  onOpenSale,
}: ProductCardProps) {
  const router = useRouter();

  const handlePressCard = () => {
    if (route) {
      router.push(route as any);
    } else {
      router.push({ pathname: `/(store)/add-product?productId=${productId}` } as any);
    }
  };

  return (
    <Pressable style={{ width: "48%", marginBottom: 16 }} onPress={handlePressCard}>
      <Box bg="white" borderRadius={16} overflow="hidden" shadow={2}>
        <Box position="relative">
          {imageUrl ? (
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: 180 }}
              resizeMode="cover"
            />
          ) : (
            <Box width="100%" height={180} bg="gray.200" alignItems="center" justifyContent="center">
              <Ionicons name="image-outline" size={32} color="#9ca3af" />
            </Box>
          )}

          {!isActive && (
            <Box
              position="absolute"
              top={8}
              left={8}
              bg="rgba(0,0,0,0.55)"
              px={2}
              py={1}
              borderRadius={999}
            >
              <Text color="white" fontSize="2xs" fontWeight="bold">
                ปิดการขาย
              </Text>
            </Box>
          )}

          <Box
            position="absolute"
            top={2}
            right={2}
            flexDirection="row"
            alignItems="center"
            bg="rgba(0,0,0,0.35)"
            borderRadius={999}
            px={2}
            py={1}
          >
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                onToggleFavorite && onToggleFavorite();
              }}
              style={{ paddingHorizontal: 4, paddingVertical: 2 }}
            >
              <Ionicons name="heart-outline" size={16} color="#fff" />
            </Pressable>

            {isSeller && (
              <Box
                marginLeft={2}
                borderLeftWidth={1}
                borderLeftColor="rgba(255,255,255,0.4)"
                paddingLeft={2}
                flexDirection="row"
                alignItems="center"
              >
                {isActive ? (
                  onCloseSale ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        onCloseSale();
                      }}
                      style={{ padding: 4, marginRight: 2 }}
                    >
                      <Ionicons name="ban-outline" size={18} color="#fff" />
                    </Pressable>
                  ) : null
                ) : onOpenSale ? (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onOpenSale();
                    }}
                    style={{ padding: 4, marginRight: 2 }}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                  </Pressable>
                ) : null}

                <EditIconButton route={route} />
              </Box>
            )}
          </Box>
        </Box>

        <Box px={3} py={3}>
          <Box minHeight={10} justifyContent="flex-start">
            <Text fontSize="xs" color="gray.700" numberOfLines={2} ellipsizeMode="tail">
              {title}
            </Text>
          </Box>

          <Box mt={2} flexDirection="row" justifyContent="space-between" alignItems="center">
            <Text fontSize="sm" fontWeight="bold" color="#8b5cf6">
              ฿{price.toFixed(0)}
            </Text>

            <Box flexDirection="row" alignItems="center">
              <Ionicons name="star" size={14} color="#facc15" />
              <Text fontSize="xs" color="gray.700" ml={1}>
                {star.toFixed(1)}
              </Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </Pressable>
  );
}

type CategoryCardProps = {
  categoryName: string;
  productCount: number;
  coverImageUrl?: string;
  onPress: () => void;
};

export function CategoryCard({ categoryName, productCount, coverImageUrl, onPress }: CategoryCardProps) {
  return (
    <Pressable style={{ width: "48%", marginBottom: 16 }} onPress={onPress}>
      <Box bg="white" borderRadius={16} overflow="hidden" shadow={2}>
        <Box position="relative" height={120}>
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          ) : (
            <Box width="100%" height="100%" bg="gray.200" alignItems="center" justifyContent="center">
              <Ionicons name="albums-outline" size={32} color="#9ca3af" />
            </Box>
          )}
        </Box>

        <Box px={3} py={2}>
          <Text fontSize="sm" fontWeight="bold" numberOfLines={1}>
            {categoryName}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {productCount} รายการ
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
}
