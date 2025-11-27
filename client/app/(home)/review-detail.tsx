// app/(customer)/product-reviews.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { Box, Text } from "native-base";
import { useLocalSearchParams } from "expo-router";

import { getProductDetail, ReviewDto } from "@/api/products";
import { AppBarNoCheck } from "@/components/navbar";
import { ReviewList } from "@/components/review/grid";

export default function ProductReviewScreen() {
  const { productId } = useLocalSearchParams<{ productId?: string }>();
  const [reviews, setReviews] = useState<ReviewDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;
    const fetchReviews = async () => {
      try {
        const detail = await getProductDetail(productId);
        setReviews(detail.reviews ?? []);
      } catch (e) {
        console.log("load reviews error", e);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, [productId]);

  return (
    <Box flex={1} bg="white">
      <AppBarNoCheck title="รีวิว" backgroundColor="white" />

      {loading ? (
        <Box flex={1} justifyContent="center" alignItems="center">
          <ActivityIndicator />
          <Text mt={2}>กำลังโหลดรีวิว...</Text>
        </Box>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </Box>
  );
}
