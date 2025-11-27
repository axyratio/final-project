// src/types/variant.ts
export type VariantOption = {
  id: string;
  name: string;
  // รูปโชว์ตัวเลือกบนหน้าสินค้า
  displayImageUri?: string;
  // รูปสำหรับลองเสื้อ (VTON) ต่อ 1 ตัวเลือก
  tryOnImageUri?: string;
};
