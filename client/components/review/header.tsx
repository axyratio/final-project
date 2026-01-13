// components/review/header.tsx
import React from "react";
import { Box, Text, Button, HStack } from "native-base";
import { ReviewDto } from "@/api/products";
import { ReviewCard } from "./card";
import { useRouter } from "expo-router";

type ReviewPreviewSectionProps = {
  productId: string;
  bestReview?: ReviewDto;
  reviewCount: number;
};

export const ReviewPreviewSection: React.FC<ReviewPreviewSectionProps> = ({
  productId,
  bestReview,
  reviewCount,
}) => {
  const router = useRouter();

const handleViewAll = () => {
  router.push({
    pathname: "/(home)/review-detail",  // ✅ เปลี่ยนจาก "/(customer)/product/[id]/reviews"
    params: { productId: productId },
  } as any);
};

  if (!bestReview) return null;

  return (
    <Box px={4} py={3} bg="white" mt={2}>
      <HStack justifyContent="space-between" alignItems="center" mb={2}>
        <Text fontWeight="600">รีวิว</Text>
        <Button
          variant="ghost"
          _text={{ color: "#7c3aed", fontSize: "xs" }}
          onPress={handleViewAll}
        >
          ดูทั้งหมด ({reviewCount})
        </Button>
      </HStack>

      <ReviewCard review={bestReview} />
    </Box>
  );
};
