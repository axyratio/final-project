import { getToken } from "@/utils/secure-store";
import { DOMAIN } from "@/้host";
import axios from "axios";

export type AppliedStoreType = {
    name: string;
    description: string;
    address?: string;
    image?: File;
};

export const getMyStore = async () => {
    try {
        const token = await getToken();

        if (!token) {
            throw new Error("Token not found. Please log in again.");
        }

        const response = await axios.post(`${DOMAIN}/store`, {}, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            validateStatus: (status) => status < 500, // ✅ จะไม่ throw สำหรับ 400/404 แล้ว
        });

        return response.data;

    } catch (error: any) {
        console.error("❌ Error get store:", error);
        throw error.response?.data || { message: "Unknown error" };
    }
};

export const updateStore = async (storeId: string, data: Partial<AppliedStoreType & { logo?: File }>) => {
    try {
        const token = await getToken();
        if (!token) {
            throw new Error("Token not found.");
        }

        const formData = new FormData();
        // วนลูปเพื่อ append ข้อมูลทั้งหมดใน data ลงใน formData
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value as any);
            }
        });

        const response = await axios.patch(`${DOMAIN}/store/update`, formData, {
            headers: {
                "Content-Type": "multipart/form-data", // <--- เปลี่ยนเป็น multipart/form-data
                Authorization: `Bearer ${token}`,
            },
            validateStatus: (status) => status < 500,
        });

        return response.data;
    } catch (error: any) {
        console.error("❌ Error updating store:", error);
        throw error.response?.data || { message: "Unknown error" };
    }
};
    


export const appliedStore = async (store: AppliedStoreType) => {
    try {
        const token = await getToken();

        if (!token) {
            throw new Error("Token not found. Please log in again.");
        }

        const formData = new FormData();
        formData.append("name", store.name);
        formData.append("description", store.description);
        formData.append("address", store.address || ""); // ให้แน่ใจว่าเป็น string
        if (store.image) formData.append("image", store.image);

        const response = await axios.post(`${DOMAIN}/store/create-with-stripe`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
                Authorization: `Bearer ${token}`,
            },
            validateStatus: (status) => status < 500, // ✅ จะไม่ throw สำหรับ 400/404 แล้ว
        });

    
        return response.data;
    } catch (error: any) {
        console.error("❌ Error creating store with Stripe:", error);
        throw error.response?.data || { message: "Unknown error" };
    }
};