/**
 * CLOSET API SERVICE (IMPROVED VERSION)
 * แก้ไขปัญหา FormData และ File Upload สำหรับ React Native
 */

import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import { Platform } from "react-native";

// ========== TYPES & INTERFACES ==========

export interface UserTryOnImage {
  user_image_id: string;
  image_url: string;
  uploaded_at: string;
  is_valid: boolean;
}

export interface GarmentImage {
  garment_id: string;
  name: string;
  image_url: string;
  uploaded_at: string;
  is_valid: boolean;
}

export interface ProductImage {
  image_id: string;
  product_id: string;
  variant_id: string | null;
  image_url: string;
  image_type: "NORMAL" | "VTON";
  display_order: number;
  is_main: boolean;
}

export interface ProductVariant {
  variant_id: string;
  product_id: string;
  color: string | null;
  size: string | null;
  name_option: string;
  sku: string;
  price: number;
  stock: number;
  is_active: boolean;
  images: ProductImage[];
}

export interface Product {
  product_id: string;
  store_id: string;
  product_name: string;
  base_price: number;
  category: string;
  description: string | null;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface VTONBackground {
  background_id: string;
  name: string;
  image_url: string;
  category: string | null;
  is_system: boolean;
  user_id: string | null;
  created_at: string;
}

export interface VTONSession {
  session_id: string;
  product_id: string | null;
  variant_id: string | null;
  result_image_url: string;
  background_id: string | null;
  model_used: string;
  generated_at: string;
}

export interface CreateVTONSessionRequest {
  user_image_id: string;
  background_id?: string;
  product_id?: string;
  variant_id?: string;
  garment_id?: string;
}

// ========== API CONFIG ==========

const BASE_URL = DOMAIN;
console.log("🌐 API BASE URL:", BASE_URL);

// ✅ ดึง token แบบ async ทุกครั้ง
async function getHeaders(includeContentType = true): Promise<HeadersInit> {
  const headers: HeadersInit = {};

  try {
    const token = await getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("🔑 Token attached");
    } else {
      console.warn("⚠️ No token found");
    }
  } catch (error) {
    console.error("❌ Error getting token:", error);
  }

  if (includeContentType) {
    headers["Content-Type"] = "application/json";
  }

  return headers;
}

// ✅ สร้าง file object ที่ถูกต้องสำหรับ React Native
function createFileObject(uri: string, filename: string = "upload.jpg") {
  const uriParts = uri.split(".");
  const fileExtension = uriParts[uriParts.length - 1].toLowerCase();

  let mimeType = "image/jpeg";
  if (fileExtension === "png") {
    mimeType = "image/png";
  } else if (fileExtension === "heic" || fileExtension === "heif") {
    mimeType = "image/heic";
  } else if (fileExtension === "gif") {
    mimeType = "image/gif";
  } else if (fileExtension === "webp") {
    mimeType = "image/webp";
  }

  return {
    uri: Platform.OS === "android" ? uri : uri.replace("file://", ""),
    type: mimeType,
    name: filename,
  };
}

// ========== API SERVICE ==========

export const closetApi = {
  // ==================== USER TRYON IMAGES ====================

  async uploadUserTryOnImage(fileUri: string): Promise<UserTryOnImage> {
    try {
      console.log("📤 [USER IMAGE] Starting upload");
      console.log("📁 [USER IMAGE] URI:", fileUri);

      const formData = new FormData();
      const file = createFileObject(fileUri, `user_model_${Date.now()}.jpg`);

      console.log("📦 [USER IMAGE] File object:", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      // @ts-ignore
      formData.append("file", file);

      const headers = await getHeaders(false);
      const url = `${BASE_URL}/vton/user-images`;

      console.log("🌐 [USER IMAGE] POST:", url);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("📥 [USER IMAGE] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [USER IMAGE] Error response:", errorText);

        try {
          const error = JSON.parse(errorText);
          throw new Error(error.detail || error.message || "Upload failed");
        } catch (e) {
          throw new Error(`Upload failed: ${response.status} - ${errorText}`);
        }
      }

      const result = await response.json();
      console.log("✅ [USER IMAGE] Success:", result);
      return result.data;
    } catch (error) {
      console.error("❌ [USER IMAGE] Exception:", error);
      throw error;
    }
  },

  async getUserTryOnImages(): Promise<UserTryOnImage[]> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/user-images`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch user images");
      }

      const result = await response.json();
      return result.data.images;
    } catch (error) {
      console.error("❌ [GET USER IMAGES] Error:", error);
      throw error;
    }
  },

  async deleteUserTryOnImage(imageId: string): Promise<void> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/user-images/${imageId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete failed");
      }
    } catch (error) {
      console.error("❌ [DELETE USER IMAGE] Error:", error);
      throw error;
    }
  },

  // ==================== GARMENT IMAGES (OUTFIT) ====================

  async uploadGarmentImage(
    fileUri: string,
    name?: string,
  ): Promise<GarmentImage> {
    try {
      console.log("📤 [GARMENT] Starting upload");
      console.log("📁 [GARMENT] URI:", fileUri);
      console.log("📝 [GARMENT] Name:", name);

      const formData = new FormData();
      const file = createFileObject(fileUri, `garment_${Date.now()}.jpg`);

      console.log("📦 [GARMENT] File object:", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      // @ts-ignore
      formData.append("file", file);

      if (name) {
        formData.append("name", name);
      }

      const headers = await getHeaders(false);
      const url = `${BASE_URL}/vton/garments`;

      console.log("🌐 [GARMENT] POST:", url);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("📥 [GARMENT] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [GARMENT] Error response:", errorText);

        try {
          const error = JSON.parse(errorText);
          throw new Error(
            error.detail || error.message || "Upload garment failed",
          );
        } catch (e) {
          throw new Error(
            `Upload garment failed: ${response.status} - ${errorText}`,
          );
        }
      }

      const result = await response.json();
      console.log("✅ [GARMENT] Success:", result);
      return result.data;
    } catch (error) {
      console.error("❌ [GARMENT] Exception:", error);
      throw error;
    }
  },

  async getGarmentImages(): Promise<GarmentImage[]> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/garments`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch garments");
      }

      const result = await response.json();
      return result.data.garments;
    } catch (error) {
      console.error("❌ [GET GARMENTS] Error:", error);
      throw error;
    }
  },

  async deleteGarmentImage(garmentId: string): Promise<void> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/garments/${garmentId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete garment failed");
      }
    } catch (error) {
      console.error("❌ [DELETE GARMENT] Error:", error);
      throw error;
    }
  },

  // ==================== PRODUCT GARMENTS (เสื้อจากสินค้า) ====================

  async addProductGarment(productId: string, variantId: string): Promise<void> {
    try {
      console.log("📤 [PRODUCT GARMENT] Adding:", { productId, variantId });

      const formData = new FormData();
      formData.append("product_id", productId);
      formData.append("variant_id", variantId);

      const headers = await getHeaders(false);
      const url = `${BASE_URL}/vton/product-garments`;

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [PRODUCT GARMENT] Error:", errorText);

        if (
          response.status === 400 &&
          (errorText.includes("ถูกเพิ่มไว้แล้ว") ||
            errorText.includes("already") ||
            errorText.includes("exists"))
        ) {
          return;
        }

        try {
          const error = JSON.parse(errorText);
          const msg = String(error.detail || error.message || "");
          if (
            msg.includes("ถูกเพิ่มไว้แล้ว") ||
            msg.includes("already") ||
            msg.includes("exists")
          ) {
            return;
          }
          throw new Error(
            error.detail || error.message || "Add product garment failed",
          );
        } catch (e) {
          throw new Error(
            `Add product garment failed: ${response.status} - ${errorText}`,
          );
        }
      }

      const result = await response.json().catch(() => null);
      console.log("✅ [PRODUCT GARMENT] Added/Exists:", result);
      return;
    } catch (error) {
      console.error("❌ [PRODUCT GARMENT] Exception:", error);
      return;
    }
  },

  async getProductGarments(): Promise<ProductVariant[]> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/product-garments`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch product garments");
      }

      const result = await response.json();
      return result.data.product_garments;
    } catch (error) {
      console.error("❌ [GET PRODUCT GARMENTS] Error:", error);
      throw error;
    }
  },

  async deleteProductGarment(variantId: string): Promise<void> {
    try {
      const headers = await getHeaders();

      const response = await fetch(
        `${BASE_URL}/vton/product-garments/${variantId}`,
        {
          method: "DELETE",
          headers,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete product garment failed");
      }
    } catch (error) {
      console.error("❌ [DELETE PRODUCT GARMENT] Error:", error);
      throw error;
    }
  },

  // ==================== VTON BACKGROUNDS ====================

  async uploadVTONBackground(
    fileUri: string,
    name: string,
    category?: string,
  ): Promise<VTONBackground> {
    try {
      console.log("📤 [BACKGROUND] Starting upload");
      console.log("📁 [BACKGROUND] URI:", fileUri);
      console.log("📝 [BACKGROUND] Name:", name);

      const formData = new FormData();
      const file = createFileObject(fileUri, `background_${Date.now()}.jpg`);

      console.log("📦 [BACKGROUND] File object:", {
        uri: file.uri,
        type: file.type,
        name: file.name,
      });

      // @ts-ignore
      formData.append("file", file);
      formData.append("name", name);

      if (category) {
        formData.append("category", category);
      }

      const headers = await getHeaders(false);
      const url = `${BASE_URL}/vton/backgrounds`;

      console.log("🌐 [BACKGROUND] POST:", url);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("📥 [BACKGROUND] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [BACKGROUND] Error response:", errorText);

        try {
          const error = JSON.parse(errorText);
          throw new Error(
            error.detail || error.message || "Upload background failed",
          );
        } catch (e) {
          throw new Error(
            `Upload background failed: ${response.status} - ${errorText}`,
          );
        }
      }

      const result = await response.json();
      console.log("✅ [BACKGROUND] Success:", result);
      return result.data;
    } catch (error) {
      console.error("❌ [BACKGROUND] Exception:", error);
      throw error;
    }
  },

  async getVTONBackgrounds(): Promise<VTONBackground[]> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/backgrounds`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch backgrounds");
      }

      const result = await response.json();
      return result.data.backgrounds;
    } catch (error) {
      console.error("❌ [GET BACKGROUNDS] Error:", error);
      throw error;
    }
  },

  async deleteVTONBackground(backgroundId: string): Promise<void> {
    try {
      const headers = await getHeaders();

      const response = await fetch(
        `${BASE_URL}/vton/backgrounds/${backgroundId}`,
        {
          method: "DELETE",
          headers,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete background failed");
      }
    } catch (error) {
      console.error("❌ [DELETE BACKGROUND] Error:", error);
      throw error;
    }
  },

  // ==================== VTON SESSION ====================

  async createVTONSession(
    request: CreateVTONSessionRequest,
  ): Promise<VTONSession> {
    try {
      console.log("🎨 [VTON SESSION] Creating session");
      console.log("📋 [VTON SESSION] Request:", request);

      const formData = new FormData();
      formData.append("user_image_id", request.user_image_id);

      if (request.product_id) {
        formData.append("product_id", request.product_id);
      }

      if (request.variant_id) {
        formData.append("variant_id", request.variant_id);
      }

      if (request.background_id) {
        formData.append("background_id", request.background_id);
      }

      if (request.garment_id) {
        formData.append("garment_id", request.garment_id);
      }

      const headers = await getHeaders(false);
      const url = `${BASE_URL}/vton/sessions`;

      console.log("🌐 [VTON SESSION] POST:", url);

      const response = await fetch(url, {
        method: "POST",
        headers,
        body: formData,
      });

      console.log("📥 [VTON SESSION] Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ [VTON SESSION] Error response:", errorText);

        try {
          const error = JSON.parse(errorText);
          throw new Error(
            error.detail || error.message || "VTON processing failed",
          );
        } catch (e) {
          throw new Error(
            `VTON processing failed: ${response.status} - ${errorText}`,
          );
        }
      }

      const result = await response.json();
      console.log("✅ [VTON SESSION] Success:", result);
      return result.data;
    } catch (error) {
      console.error("❌ [VTON SESSION] Exception:", error);
      throw error;
    }
  },

  async changeBackgroundFromSession(
    sessionId: string,
    newBackgroundId?: string,
  ): Promise<VTONSession> {
    try {
      const formData = new FormData();
      if (newBackgroundId) {
        formData.append("new_background_id", newBackgroundId);
      }

      const headers = await getHeaders(false);

      const response = await fetch(
        `${BASE_URL}/vton/sessions/${sessionId}/change-background`,
        {
          method: "POST",
          headers,
          body: formData,
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Change background failed");
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("❌ [CHANGE BACKGROUND] Error:", error);
      throw error;
    }
  },

  async getVTONSessions(limit: number = 20): Promise<VTONSession[]> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/sessions?limit=${limit}`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch sessions");
      }

      const result = await response.json();
      return result.data.sessions;
    } catch (error) {
      console.error("❌ [GET SESSIONS] Error:", error);
      throw error;
    }
  },

  // ✅ เพิ่มฟังก์ชันลบ VTON Session
  async deleteVTONSession(sessionId: string): Promise<void> {
    try {
      console.log("🗑️ [DELETE SESSION] Deleting session:", sessionId);
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/vton/sessions/${sessionId}`, {
        method: "DELETE",
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Delete session failed");
      }

      console.log("✅ [DELETE SESSION] Success");
    } catch (error) {
      console.error("❌ [DELETE SESSION] Error:", error);
      throw error;
    }
  },

  // ==================== PRODUCTS ====================

  async getProduct(productId: string): Promise<Product> {
    try {
      const headers = await getHeaders();

      const response = await fetch(`${BASE_URL}/products/${productId}`, {
        headers,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Product not found");
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error("❌ [GET PRODUCT] Error:", error);
      throw error;
    }
  },
};

// ========== MOCK DATA ==========

export const mockData = {
  userImages: [
    {
      user_image_id: "1",
      image_url:
        "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400",
      uploaded_at: new Date().toISOString(),
      is_valid: true,
    },
  ] as UserTryOnImage[],

  garments: [
    {
      garment_id: "g1",
      name: "เสื้อยืดสีดำ",
      image_url:
        "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
      uploaded_at: new Date().toISOString(),
      is_valid: true,
    },
  ] as GarmentImage[],

  product: {
    product_id: "prod1",
    store_id: "store1",
    product_name: "เสื้อแขนยาวผูกโบว์",
    base_price: 890,
    category: "เสื้อผ้าผู้หญิง",
    description: "เสื้อแขนยาวสไตล์เกาหลี",
    images: [
      {
        image_id: "img1",
        product_id: "prod1",
        variant_id: null,
        image_url:
          "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
        image_type: "NORMAL" as const,
        display_order: 0,
        is_main: true,
      },
    ],
    variants: [
      {
        variant_id: "var1",
        product_id: "prod1",
        color: "เขียวขี้ม้า",
        size: "M",
        name_option: "เขียวขี้ม้า / M",
        sku: "SKU001",
        price: 890,
        stock: 10,
        is_active: true,
        images: [
          {
            image_id: "img2",
            product_id: "prod1",
            variant_id: "var1",
            image_url:
              "https://images.unsplash.com/photo-1594633313593-bab3825d0caf?w=400",
            image_type: "NORMAL" as const,
            display_order: 0,
            is_main: false,
          },
        ],
      },
      {
        variant_id: "var2",
        product_id: "prod1",
        color: "ขาว",
        size: "M",
        name_option: "ขาว / M",
        sku: "SKU002",
        price: 890,
        stock: 5,
        is_active: true,
        images: [
          {
            image_id: "img3",
            product_id: "prod1",
            variant_id: "var2",
            image_url:
              "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400",
            image_type: "NORMAL" as const,
            display_order: 0,
            is_main: false,
          },
        ],
      },
    ],
  } as Product,

  backgrounds: [
    {
      background_id: "bg1",
      name: "Beach Sunset",
      image_url:
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400",
      category: "Nature",
      is_system: true,
      user_id: null,
      created_at: new Date().toISOString(),
    },
  ] as VTONBackground[],
};
