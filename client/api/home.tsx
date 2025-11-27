// api/home/homeApi.ts
import { DOMAIN } from "@/้host";

const API_BASE_URL = `${DOMAIN}`;

// =========================
// TYPES
// =========================

export type HomeBanner = {
  id: string;
  title: string;
  subtitle?: string;
  buttonLabel: string;
  imageUrl: string;
  route?: string; // หน้าไหนที่จะไปต่อ เช่น "/try-on"
};

export type HomeCategory = {
  id: string;
  name: string;
  backgroundColor?: string; // เช่น "#fee2e2", "#e0f2fe"
  iconUrl: string; // ถ้า front มี asset local ก็เอา id ไป map เป็น require()
};

export type HomeProduct = {
  id: string;
  title: string;
  price: number;
  rating: number;

  // 🆕 ใช้ imageId สำหรับ stream จาก backend
  imageId?: string;

  // เผื่ออนาคต backend ส่ง URL ตรง ๆ มา
  imageUrl?: string;
};

export type HomeData = {
  banners: HomeBanner[];
  categories: HomeCategory[];
  products: HomeProduct[];
};

// =========================
// SINGLE HOME API
// GET /home → ส่งก้อนเดียว: { banners, categories, products }
// =========================

export async function fetchHomeData(): Promise<HomeData> {
  const res = await fetch(`${API_BASE_URL}/home`);
  if (!res.ok) throw new Error("Failed to fetch home data");
  const json = await res.json();

  // สมมติ backend ส่งรูปแบบ:
  // { data: { banners: [...], categories: [...], products: [...] } }
  const data = json.data ?? json;

  return {
    banners: data.banners ?? [],
    categories: data.categories ?? [],
    products: data.products ?? [],
  } as HomeData;
}


// api/home/categoryApi.ts


// สินค้าในหน้า Category จะรู้ว่าอยู่หมวดไหน
// api/home/categoryApi.ts


// product ในหน้า category มี categoryId เพิ่มขึ้นมา (ชื่อหมวดเป็นภาษาไทย)
export type CategoryProduct = HomeProduct & {
  categoryId: string;  // เช่น "เสื้อกีฬา", "ชุดนอน"
};

export type CategoryPageData = {
  categories: HomeCategory[];
  products: CategoryProduct[];
};

export async function fetchCategoryPageData(): Promise<CategoryPageData> {
  const res = await fetch(`${API_BASE_URL}/home/categories-page`);
  if (!res.ok) throw new Error("Failed to fetch category page data");

  const json = await res.json();
  const data = json.data ?? json;

  return {
    categories: data.categories ?? [],
    products: data.products ?? [],
  } as CategoryPageData;
}
