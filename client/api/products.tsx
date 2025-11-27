// src/api/product_api_service.ts

import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;
const PRODUCT_API_BASE = `${API_BASE_URL}/products`;

type FullPayload = {
  product_name: string;
  description: string;
  base_price: number;
  stock_quantity: number;
  category: string;
  images: Array<{
    image_id: string;
    is_main: boolean;
    display_order: number;
    image_type: "NORMAL";
  }>;
  variant: {
    variant_name: string;
    enable_vton: boolean;
    options: Array<{
      variant_id: string | null;
      name: string;
      price_delta: number;
      stock: number;
      images: Array<{
        image_id: string;
        image_type: "NORMAL" | "VTON";
        is_main: boolean;
        display_order: number;
      }>;
    }>;
  } | null;
};

type APIResponse = {
  success: boolean;
  message: string;
  data?: any;
};

export const ProductAPIService = {
  
  /**
   * ส่ง Payload เต็มรูปแบบ (Product + Variant) ไปยัง Backend
   * @param productId ถ้ามี = แก้ไข (PUT), ถ้าไม่มี = สร้างใหม่ (POST)
   * @param payload ข้อมูล Product และ Variant
   * @param token Auth Token
   */
  postFullPayload: async (
    productId: string | undefined,
    payload: FullPayload,
    token: string,
  ): Promise<APIResponse> => {
    
    const method = productId ? "PATCH" : "POST";
    // 🚨 Backend API ถูกออกแบบให้รับ Product ID ใน URL สำหรับ POST (สร้างใหม่) หรือ PATCH (แก้ไข)
    const url = productId 
      ? `${PRODUCT_API_BASE}/${productId}/update` // PATCH สำหรับแก้ไข
      : `${PRODUCT_API_BASE}/create_full`;            // POST สำหรับสร้างใหม่
      
    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json", // 🚨 ส่งเป็น JSON
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      
      if (!res.ok || !json.success) {
        return { success: false, message: json.message || "บันทึกข้อมูลไม่สำเร็จ" };
      }

      return { success: true, message: json.message, data: json.data };

    } catch (error) {
      console.error("ProductAPI Post Error:", error);
      return { success: false, message: "Server ไม่ตอบสนอง" };
    }
  },
  
  // ... คุณสามารถเพิ่ม getProduct, deleteProduct ในนี้ได้
};

// api/product.ts
import { getToken } from "@/utils/secure-store";

export type ImageType = "NORMAL" | "VTON";

export type ProductImageDto = {
  imageId: string;
  imageUrl: string;
  imageType: ImageType;
  displayOrder: number;
  isMain: boolean;
};

export type VariantImageDto = {
  imageId: string;
  imageUrl: string;
  imageType: ImageType;
};

export type ProductVariantDto = {
  variantId: string;
  variantName: string;  // size / color ฯลฯ
  sku: string;
  price: number;
  stock: number;
  images: VariantImageDto[];
};

export type StoreSummaryDto = {
  storeId: string;
  name: string;
  description?: string;
  logoPath?: string;
  address?: string;
  rating?: number;
};



export type ReviewDto = {
  reviewId: string;
  userDisplayName: string;   // mask แล้วจาก backend เลยก็ได้
  rating: number;
  comment?: string;
  variantName?: string;
  createdAt: string;
};

export type ProductDetailDto = {
  productId: string;
  productName: string;
  basePrice: number;
  originalPrice?: number;
  discountPercent?: number;
  description?: string;
  averageRating: number;
  reviewCount: number;

  images: ProductImageDto[];
  variants: ProductVariantDto[];
  store: StoreSummaryDto;

  bestReview?: ReviewDto;
  reviews?: ReviewDto[];   // สำหรับหน้า list ทั้งหมด

  cartTotalItems: number;        // item ทั้งหมดในตะกร้า user
  cartProductQuantity: number;   // จำนวนสินค้านี้ในตะกร้า
};
export async function getProductDetail(
  productId: string
): Promise<ProductDetailDto> {
  const token = await getToken();

  const res = await fetch(`${PRODUCT_API_BASE}/${productId}/detail`, {
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    console.log("getProductDetail error:", res.status, text);
    throw new Error("Failed to load product detail");
  }

  const json = await res.json();
  const d = json.data;

  const detail: ProductDetailDto = {
    productId: d.product_id,
    productName: d.product_name,
    basePrice: d.base_price,
    originalPrice: d.original_price ?? undefined,
    discountPercent: d.discount_percent ?? undefined,
    description: d.description ?? "",
    averageRating: d.average_rating ?? 0,
    reviewCount: d.review_count ?? 0,

    images: (d.images ?? []).map((img: any) => ({
      imageId: img.image_id,
      imageUrl: `${API_BASE_URL}/images/stream/${img.image_id}`,
      imageType: img.image_type,
      displayOrder: img.display_order ?? 0,
      isMain: !!img.is_main,
    })),

    variants: (d.variants ?? []).map((v: any) => ({
      variantId: v.variant_id,
      variantName: v.variant_name,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      images: (v.images ?? []).map((img: any) => ({
        imageId: img.image_id,
        imageUrl: `${API_BASE_URL}/images/stream/${img.image_id}`,
        imageType: img.image_type,
      })),
    })),

    store: {
      storeId: d.store.store_id,
      name: d.store.name,
      description: d.store.description ?? undefined,
      logoPath: d.store.logo_path ?? undefined,
      address: d.store.address ?? undefined,
      rating: d.store.rating ?? undefined,
    },

    bestReview: d.best_review
      ? {
          reviewId: d.best_review.review_id,
          userDisplayName: d.best_review.user_display_name,
          rating: d.best_review.rating,
          comment: d.best_review.comment ?? "",
          variantName: d.best_review.variant_name ?? "",
          createdAt: d.best_review.created_at,
        }
      : undefined,

    reviews: (d.reviews ?? []).map((rv: any) => ({
      reviewId: rv.review_id,
      userDisplayName: rv.user_display_name,
      rating: rv.rating,
      comment: rv.comment ?? "",
      variantName: rv.variant_name ?? "",
      createdAt: rv.created_at,
    })),

    // 👇 map cart_summary
    cartTotalItems: d.cart_summary?.total_items ?? 0,
    cartProductQuantity: d.cart_summary?.product_quantity ?? 0,
  };

  return detail;
}

