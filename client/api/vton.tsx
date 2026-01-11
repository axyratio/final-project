// /**
//  * VTON API SERVICE
//  * ระบบ Virtual Try-On สำหรับลองเสื้อ
//  */

// // ========== TYPES & INTERFACES ==========

// export interface UserTryOnImage {
//   user_image_id: string;
//   image_url: string;
//   uploaded_at: string;
//   is_valid: boolean;
// }

// export interface GarmentImage {
//   garment_id: string;
//   name: string;
//   image_url: string;
//   uploaded_at: string;
//   is_valid: boolean;
// }

// export interface VTONBackground {
//   background_id: string;
//   name: string;
//   image_url: string;
//   category: string | null;
//   is_system: boolean;
//   user_id: string | null;
//   created_at: string;
// }

// export interface VTONSession {
//   session_id: string;
//   product_id: string;
//   variant_id: string | null;
//   result_image_url: string;
//   background_id: string | null;
//   model_used: string;
//   generated_at: string;
// }

// export interface CreateVTONSessionRequest {
//   user_image_id: string;
//   background_id?: string;
//   product_id?: string;  // ✅ Optional
//   variant_id?: string;
//   garment_id?: string;  // ✅ เพิ่ม garment_id
// }

// export interface ChangeBackgroundRequest {
//   session_id: string;
//   new_background_id?: string;
// }

// // ========== API CONFIG ==========

// const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

// // Helper: สร้าง Headers พร้อม Authorization
// function getHeaders(includeContentType = true): HeadersInit {
//   const headers: HeadersInit = {};
  
//   // TODO: ดึง token จาก storage
//   const token = localStorage.getItem('access_token');
//   if (token) {
//     headers['Authorization'] = `Bearer ${token}`;
//   }
  
//   if (includeContentType) {
//     headers['Content-Type'] = 'application/json';
//   }
  
//   return headers;
// }

// // ========== API SERVICE ==========

// export const vtonApi = {
//   // ==================== USER TRYON IMAGES ====================
  
//   /**
//    * อัปโหลดรูปโมเดลของผู้ใช้
//    */
//   async uploadUserTryOnImage(file: File | any): Promise<UserTryOnImage> {
//     const formData = new FormData();
//     formData.append('file', file);

//     const response = await fetch(`${BASE_URL}/vton/user-images`, {
//       method: 'POST',
//       headers: getHeaders(false), // ไม่ใส่ Content-Type ให้ browser จัดการเอง
//       body: formData,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Upload failed');
//     }

//     const result = await response.json();
//     return result.data;
//   },

//   /**
//    * ดึงรูปโมเดลทั้งหมดของผู้ใช้
//    */
//   async getUserTryOnImages(): Promise<UserTryOnImage[]> {
//     const response = await fetch(`${BASE_URL}/vton/user-images`, {
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Failed to fetch user images');
    
//     const result = await response.json();
//     return result.data.images;
//   },

//   /**
//    * ลบรูปโมเดล
//    */
//   async deleteUserTryOnImage(imageId: string): Promise<void> {
//     const response = await fetch(`${BASE_URL}/vton/user-images/${imageId}`, {
//       method: 'DELETE',
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Delete failed');
//   },

//   // ==================== GARMENT IMAGES (OUTFIT) ====================
  
//   /**
//    * อัปโหลดรูปเสื้อผ้า (Outfit)
//    */
//   async uploadGarmentImage(file: File | any, name?: string): Promise<GarmentImage> {
//     const formData = new FormData();
//     formData.append('file', file);
//     if (name) formData.append('name', name);

//     const response = await fetch(`${BASE_URL}/vton/garments`, {
//       method: 'POST',
//       headers: getHeaders(false),
//       body: formData,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Upload garment failed');
//     }

//     const result = await response.json();
//     return result.data;
//   },

//   /**
//    * ดึงรูปเสื้อผ้าทั้งหมดของผู้ใช้
//    */
//   async getGarmentImages(): Promise<GarmentImage[]> {
//     const response = await fetch(`${BASE_URL}/vton/garments`, {
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Failed to fetch garments');
    
//     const result = await response.json();
//     return result.data.garments;
//   },

//   /**
//    * ลบรูปเสื้อผ้า
//    */
//   async deleteGarmentImage(garmentId: string): Promise<void> {
//     const response = await fetch(`${BASE_URL}/vton/garments/${garmentId}`, {
//       method: 'DELETE',
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Delete garment failed');
//   },

//   // ==================== VTON BACKGROUNDS ====================
  
//   /**
//    * อัปโหลดพื้นหลังส่วนตัว
//    */
//   async uploadVTONBackground(
//     file: File | any,
//     name: string,
//     category?: string
//   ): Promise<VTONBackground> {
//     const formData = new FormData();
//     formData.append('file', file);
//     formData.append('name', name);
//     if (category) formData.append('category', category);

//     const response = await fetch(`${BASE_URL}/vton/backgrounds`, {
//       method: 'POST',
//       headers: getHeaders(false),
//       body: formData,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Upload background failed');
//     }

//     const result = await response.json();
//     return result.data;
//   },

//   /**
//    * ดึงพื้นหลังทั้งหมด (System + User's Own)
//    */
//   async getVTONBackgrounds(): Promise<VTONBackground[]> {
//     const response = await fetch(`${BASE_URL}/vton/backgrounds`, {
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Failed to fetch backgrounds');
    
//     const result = await response.json();
//     return result.data.backgrounds;
//   },

//   /**
//    * ลบพื้นหลัง (เฉพาะที่ผู้ใช้สร้างเอง)
//    */
//   async deleteVTONBackground(backgroundId: string): Promise<void> {
//     const response = await fetch(`${BASE_URL}/vton/backgrounds/${backgroundId}`, {
//       method: 'DELETE',
//       headers: getHeaders(),
//     });

//     if (!response.ok) throw new Error('Delete background failed');
//   },

//   // ==================== VTON SESSION ====================
  
//   /**
//    * สร้าง VTON Session (ลองเสื้อ)
//    */
//   async createVTONSession(request: CreateVTONSessionRequest): Promise<VTONSession> {
//     const formData = new FormData();
//     formData.append('user_image_id', request.user_image_id);
    
//     if (request.product_id) {
//       formData.append('product_id', request.product_id);
//     }
    
//     if (request.variant_id) {
//       formData.append('variant_id', request.variant_id);
//     }
    
//     if (request.background_id) {
//       formData.append('background_id', request.background_id);
//     }
    
//     if (request.garment_id) {
//       formData.append('garment_id', request.garment_id);
//     }

//     const response = await fetch(`${BASE_URL}/vton/sessions`, {
//       method: 'POST',
//       headers: getHeaders(false),
//       body: formData,
//     });

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'VTON processing failed');
//     }

//     const result = await response.json();
//     return result.data;
//   },

//   /**
//    * เปลี่ยนพื้นหลังจากผลลัพธ์เดิม
//    */
//   async changeBackgroundFromSession(
//     request: ChangeBackgroundRequest
//   ): Promise<VTONSession> {
//     const formData = new FormData();
    
//     if (request.new_background_id) {
//       formData.append('new_background_id', request.new_background_id);
//     }

//     const response = await fetch(
//       `${BASE_URL}/vton/sessions/${request.session_id}/change-background`,
//       {
//         method: 'POST',
//         headers: getHeaders(false),
//         body: formData,
//       }
//     );

//     if (!response.ok) {
//       const error = await response.json();
//       throw new Error(error.message || 'Change background failed');
//     }

//     const result = await response.json();
//     return result.data;
//   },

//   /**
//    * ดึงประวัติการลองเสื้อ
//    */
//   async getVTONSessions(limit: number = 20): Promise<VTONSession[]> {
//     const response = await fetch(
//       `${BASE_URL}/vton/sessions?limit=${limit}`,
//       {
//         headers: getHeaders(),
//       }
//     );

//     if (!response.ok) throw new Error('Failed to fetch sessions');
    
//     const result = await response.json();
//     return result.data.sessions;
//   },
// };

// // ========== USAGE EXAMPLES ==========

// /*
// // 1. อัปโหลดรูปโมเดล
// const userImage = await vtonApi.uploadUserTryOnImage(file);

// // 2. อัปโหลดรูปเสื้อผ้า (Outfit)
// const garment = await vtonApi.uploadGarmentImage(file, 'เสื้อยืดสีดำ');

// // 3. อัปโหลดพื้นหลัง
// const background = await vtonApi.uploadVTONBackground(file, 'Beach Sunset', 'Nature');

// // 4. ลองเสื้อจาก Product
// const session1 = await vtonApi.createVTONSession({
//   user_image_id: userImage.user_image_id,
//   product_id: 'prod-123',
//   variant_id: 'var-456',
//   background_id: background.background_id,
// });

// // 5. ลองเสื้อจาก Garment (Outfit)
// const session2 = await vtonApi.createVTONSession({
//   user_image_id: userImage.user_image_id,
//   garment_id: garment.garment_id,
//   background_id: background.background_id,
// });

// // 6. เปลี่ยนพื้นหลังจากผลลัพธ์เดิม
// const newSession = await vtonApi.changeBackgroundFromSession({
//   session_id: session1.session_id,
//   new_background_id: 'other-bg-id',
// });

// // 7. ดึงรายการทั้งหมด
// const userImages = await vtonApi.getUserTryOnImages();
// const garments = await vtonApi.getGarmentImages();
// const backgrounds = await vtonApi.getVTONBackgrounds();
// const sessions = await vtonApi.getVTONSessions(20);

// // 8. ลบข้อมูล
// await vtonApi.deleteUserTryOnImage(userImage.user_image_id);
// await vtonApi.deleteGarmentImage(garment.garment_id);
// await vtonApi.deleteVTONBackground(background.background_id);
// */